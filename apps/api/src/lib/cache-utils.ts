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

export const invalidateCache = async (
  redis: Redis,
  ...keys: string[]
): Promise<void> => {
  if (keys.length > 0) {
    await redis.del(...keys);
  }
};

// Cache key builders
export const cacheKeys = {
  virtualKey: (keyHash: string) => `vk:${keyHash}`,
  orgPlan: (orgId: string) => `plan:${orgId}`,
  providerConfigs: (orgId: string, provider: string) =>
    `pc:${orgId}:${provider}`
} as const;
