import { createHash } from "node:crypto";
import type { Database } from "@raven/db";
import type { Redis } from "ioredis";
import { analyzeContent } from "./content-analyzer";
import type { GuardrailMatch } from "./guardrails";
import { logAndPublish, updateLastUsed } from "./logger";
import { extractCachedUsage, extractModel } from "./usage-mapper";

const DEFAULT_TTL_SECONDS = 3600;

export interface CacheCheckResult {
  hit: true;
  body: string;
  parsed: Record<string, unknown>;
}

export interface CacheMissResult {
  hit: false;
}

export type CacheResult = CacheCheckResult | CacheMissResult;

const buildCacheKey = (
  orgId: string,
  provider: string,
  model: string,
  body: Record<string, unknown>
): string => {
  const content = body.messages ?? body.input ?? [];
  const temperature = body.temperature ?? null;
  const system = body.system ?? null;
  const tools = body.tools ?? null;
  const payload = `${orgId}:${provider}:${model}:${JSON.stringify(content)}:${temperature}:${JSON.stringify(system)}:${JSON.stringify(tools)}`;
  const hash = createHash("sha256").update(payload).digest("hex");
  return `cache:resp:${hash}`;
};

export const checkCache = async (
  redis: Redis,
  orgId: string,
  provider: string,
  requestBody: Record<string, unknown>
): Promise<CacheResult> => {
  if (requestBody.stream === true) {
    return { hit: false };
  }

  const model = (requestBody.model as string) ?? "unknown";
  const key = buildCacheKey(orgId, provider, model, requestBody);
  const cached = await redis.get(key);

  if (!cached) {
    return { hit: false };
  }

  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(cached);
  } catch {
    parsed = {};
  }

  return { body: cached, hit: true, parsed };
};

export const storeCache = async (
  redis: Redis,
  orgId: string,
  provider: string,
  requestBody: Record<string, unknown>,
  responseBody: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<void> => {
  if (requestBody.stream === true) {
    return;
  }

  const model = (requestBody.model as string) ?? "unknown";
  const key = buildCacheKey(orgId, provider, model, requestBody);
  await redis.set(key, responseBody, "EX", ttlSeconds);
};

/**
 * Build the response for a cache hit, logging the request and returning the cached body.
 * Shared by both the proxy handler and the OpenAI-compat handler.
 */
export const serveCacheHit = (
  db: Database,
  cacheResult: CacheCheckResult,
  opts: {
    guardrailMatches: GuardrailMatch[];
    guardrailWarnings: string[];
    method: string;
    model: string;
    organizationId: string;
    parsedBody: Record<string, unknown>;
    path: string;
    providerConfigId: string;
    providerName: string;
    redis: Redis;
    sessionHeader: string | null;
    startTime: number;
    teamId: string | null;
    virtualKeyId: string;
  }
): Response => {
  const latencyMs = Date.now() - opts.startTime;
  const analysis = analyzeContent(opts.parsedBody, opts.sessionHeader);
  const usage = extractCachedUsage(cacheResult.parsed);

  logAndPublish(
    db,
    {
      cachedTokens: usage.cachedTokens,
      cacheHit: true,
      cost: 0,
      guardrailMatches:
        opts.guardrailMatches.length > 0 ? opts.guardrailMatches : undefined,
      hasImages: analysis.hasImages,
      hasToolUse: analysis.hasToolUse,
      imageCount: analysis.imageCount,
      inputTokens: usage.inputTokens,
      latencyMs,
      method: opts.method,
      model: extractModel(cacheResult.parsed, opts.model),
      organizationId: opts.organizationId,
      outputTokens: usage.outputTokens,
      path: opts.path,
      provider: opts.providerName,
      providerConfigId: opts.providerConfigId,
      reasoningTokens: usage.reasoningTokens,
      requestBody: opts.parsedBody,
      sessionId: analysis.sessionId,
      statusCode: 200,
      toolCount: analysis.toolCount,
      toolNames: analysis.toolNames,
      virtualKeyId: opts.virtualKeyId
    },
    { redis: opts.redis, teamId: opts.teamId }
  );
  updateLastUsed(opts.redis, opts.virtualKeyId);

  const headers: Record<string, string> = {
    "content-type": "application/json"
  };
  if (opts.guardrailWarnings.length > 0) {
    headers["X-Guardrail-Warnings"] = opts.guardrailWarnings.join("; ");
  }
  return new Response(cacheResult.body, { headers, status: 200 });
};
