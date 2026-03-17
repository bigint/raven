import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import { models } from "@raven/db";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import type { Redis } from "ioredis";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { authenticateKey } from "../proxy/auth";
import { checkBudgets } from "../proxy/budget-check";
import { checkCache } from "../proxy/cache";
import { analyzeContent } from "../proxy/content-analyzer";
import { execute } from "../proxy/execute";
import { evaluateGuardrails, type GuardrailMatch } from "../proxy/guardrails";
import { logAndPublish, updateLastUsed } from "../proxy/logger";
import { checkPlanLimit } from "../proxy/plan-check";
import { resolveProvider } from "../proxy/provider-resolver";
import { checkRateLimit } from "../proxy/rate-limiter";
import { parseIncomingRequest } from "../proxy/request-parser";
import { extractCachedUsage } from "../proxy/usage-mapper";

// Model → provider cache with 5-minute TTL
const modelProviderCache = new Map<string, string>();

const resolveModelProvider = async (
  db: Database,
  modelSlug: string
): Promise<string> => {
  const cached = modelProviderCache.get(modelSlug);
  if (cached) return cached;

  const [model] = await db
    .select({ provider: models.provider })
    .from(models)
    .where(eq(models.slug, modelSlug))
    .limit(1);

  if (!model) {
    throw new NotFoundError(
      `Model "${modelSlug}" not found. Use GET /v1/models to see available models.`
    );
  }

  modelProviderCache.set(modelSlug, model.provider);
  setTimeout(() => modelProviderCache.delete(modelSlug), 300_000);
  return model.provider;
};

export const chatCompletionsHandler = (
  db: Database,
  redis: Redis,
  env: Env
) => {
  return async (c: Context): Promise<Response> => {
    const startTime = Date.now();

    // 1. Auth
    const authHeader = c.req.header("Authorization") ?? "";
    const { virtualKey } = await authenticateKey(db, authHeader, redis);

    // 2. Parse body
    const bodyText = await c.req.text();
    let parsedBody: Record<string, unknown> = {};
    try {
      parsedBody = JSON.parse(bodyText);
    } catch {
      throw new ValidationError("Invalid JSON body");
    }

    const modelSlug = parsedBody.model as string;
    if (!modelSlug) throw new ValidationError("'model' field is required");

    // 3. Resolve provider from model
    const providerName = await resolveModelProvider(db, modelSlug);

    // 4. Gate checks
    await Promise.all([
      checkRateLimit(
        redis,
        virtualKey.id,
        virtualKey.rateLimitRpm,
        virtualKey.rateLimitRpd
      ),
      checkPlanLimit(db, redis, virtualKey.organizationId),
      checkBudgets(
        db,
        redis,
        virtualKey.organizationId,
        virtualKey.teamId,
        virtualKey.id
      )
    ]);

    // 5. Guardrails
    const messages = Array.isArray(parsedBody.messages)
      ? parsedBody.messages
      : [];
    let guardrailWarnings: string[] = [];
    let guardrailMatches: GuardrailMatch[] = [];

    if (messages.length > 0) {
      const result = await evaluateGuardrails(
        db,
        virtualKey.organizationId,
        messages
      ).catch(() => null);
      if (result) {
        guardrailWarnings = result.warnings;
        guardrailMatches = result.matches;
      }
    }

    // 6. Resolve provider config
    const fakeProxyPath = `/v1/proxy/${providerName}/chat/completions`;
    const { decryptedApiKey, providerConfigId } = await resolveProvider(
      db,
      env,
      virtualKey.organizationId,
      fakeProxyPath,
      redis
    );

    // 7. Cache check
    const cacheResult = await checkCache(
      redis,
      virtualKey.organizationId,
      providerName,
      parsedBody
    );

    if (cacheResult.hit) {
      const latencyMs = Date.now() - startTime;
      const analysis = analyzeContent(parsedBody, c.req.header("x-session-id"));
      const usage = extractCachedUsage(cacheResult.parsed);

      logAndPublish(
        db,
        {
          cachedTokens: usage.cachedTokens,
          cacheHit: true,
          cost: 0,
          guardrailMatches:
            guardrailMatches.length > 0 ? guardrailMatches : undefined,
          hasImages: analysis.hasImages,
          hasToolUse: analysis.hasToolUse,
          imageCount: analysis.imageCount,
          inputTokens: usage.inputTokens,
          latencyMs,
          method: "POST",
          model: modelSlug,
          organizationId: virtualKey.organizationId,
          outputTokens: usage.outputTokens,
          path: "/v1/chat/completions",
          provider: providerName,
          providerConfigId,
          reasoningTokens: usage.reasoningTokens,
          requestBody: parsedBody,
          sessionId: analysis.sessionId,
          statusCode: 200,
          toolCount: analysis.toolCount,
          toolNames: analysis.toolNames,
          virtualKeyId: virtualKey.id
        },
        { redis, teamId: virtualKey.teamId }
      );
      updateLastUsed(redis, virtualKey.id);

      const headers: Record<string, string> = {
        "content-type": "application/json"
      };
      if (guardrailWarnings.length > 0) {
        headers["X-Guardrail-Warnings"] = guardrailWarnings.join("; ");
      }
      return new Response(cacheResult.body, { headers, status: 200 });
    }

    // 8. Parse + execute
    const parsed = parseIncomingRequest(parsedBody, providerName);

    if (parsed.requiresRawProxy) {
      return c.json(
        {
          error: {
            code: "UNSUPPORTED_PARAMETER",
            message:
              'Parameter "n" > 1 is not currently supported. Please send separate requests.'
          }
        },
        400
      );
    }

    return execute({
      db,
      decryptedApiKey,
      env,
      extraResponseHeaders: {
        "X-Raven-Latency-Ms": String(Date.now() - startTime),
        "X-Raven-Model": modelSlug,
        "X-Raven-Provider": providerName
      },
      guardrailMatches,
      guardrailWarnings,
      incomingHeaders: c.req.header(),
      method: "POST",
      parsed,
      parsedBody,
      path: "/v1/chat/completions",
      providerConfigId,
      providerName,
      redis,
      requestedModel: modelSlug,
      sessionId: c.req.header("x-session-id") ?? null,
      startTime,
      virtualKey: {
        id: virtualKey.id,
        organizationId: virtualKey.organizationId,
        teamId: virtualKey.teamId
      }
    });
  };
};
