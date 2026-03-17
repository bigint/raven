import type { Redis } from "ioredis";

export const cachedQuery = async <T>(
  redis: Redis,
  key: string,
  ttlSeconds: number,
  queryFn: () => Promise<T>
): Promise<T> => {
  const cached = await redis.get(key);
  if (cached !== null) {
    return JSON.parse(cached) as T;
  }

  const result = await queryFn();
  await redis.set(key, JSON.stringify(result), "EX", ttlSeconds);
  return result;
};

// Cache key builders
export const cacheKeys = {
  budgets: (orgId: string, teamId: string | null, keyId: string) =>
    `budgets:${orgId}:${teamId ?? ""}:${keyId}`,
  orgPlan: (orgId: string) => `plan:${orgId}`,
  providerConfigs: (orgId: string, provider: string) =>
    `pc:${orgId}:${provider}`,
  providerModels: (configId: string) => `provider-models:${configId}`,
  virtualKey: (keyHash: string) => `vk:${keyHash}`
} as const;
