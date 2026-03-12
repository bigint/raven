import type { Redis } from "ioredis";

const ALPHA = 0.3;
const TTL_SECONDS = 86400 * 30; // 30 days

/**
 * Updates the exponential moving average latency for a provider config.
 * Formula: newAvg = alpha * latency + (1 - alpha) * oldAvg
 */
export const updateLatency = async (
  redis: Redis,
  configId: string,
  latencyMs: number
): Promise<void> => {
  const key = `latency:${configId}`;
  const existing = await redis.get(key);

  let newAvg: number;
  if (existing === null) {
    newAvg = latencyMs;
  } else {
    const oldAvg = Number.parseFloat(existing);
    newAvg = ALPHA * latencyMs + (1 - ALPHA) * oldAvg;
  }

  await redis.set(key, newAvg.toFixed(2), "EX", TTL_SECONDS);
};

/**
 * Increments the cumulative cost for a provider config in the current month.
 */
export const updateCost = async (
  redis: Redis,
  configId: string,
  cost: number
): Promise<void> => {
  if (cost <= 0) return;

  const now = new Date();
  const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const key = `cost:${configId}:${monthKey}`;

  await redis.incrbyfloat(key, cost);
  // Expire after ~35 days so old monthly keys clean up
  await redis.expire(key, 86400 * 35);
};
