import { createHash } from "node:crypto";
import type { Redis } from "ioredis";

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
  const payload = `${orgId}:${provider}:${model}:${JSON.stringify(content)}:${temperature}`;
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
