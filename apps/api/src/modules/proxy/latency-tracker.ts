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

  const newAvg =
    existing === null
      ? latencyMs
      : ALPHA * latencyMs + (1 - ALPHA) * Number.parseFloat(existing);

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

  const pipeline = redis.pipeline();
  pipeline.incrbyfloat(key, cost);
  pipeline.expire(key, 86400 * 35);
  await pipeline.exec();
};

/**
 * Combined metrics update — single call from handler instead of two separate void calls.
 */
export const updateMetrics = async (
  redis: Redis,
  configId: string,
  latencyMs: number,
  cost: number
): Promise<void> => {
  const latencyKey = `latency:${configId}`;
  const existing = await redis.get(latencyKey);

  const newAvg =
    existing === null
      ? latencyMs
      : ALPHA * latencyMs + (1 - ALPHA) * Number.parseFloat(existing);

  const pipeline = redis.pipeline();
  pipeline.set(latencyKey, newAvg.toFixed(2), "EX", TTL_SECONDS);

  if (cost > 0) {
    const now = new Date();
    const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const costKey = `cost:${configId}:${monthKey}`;
    pipeline.incrbyfloat(costKey, cost);
    pipeline.expire(costKey, 86400 * 35);
  }

  await pipeline.exec();
};
