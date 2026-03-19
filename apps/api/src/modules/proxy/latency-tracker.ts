import type { Redis } from "ioredis";

const ALPHA = 0.3;
const TTL_SECONDS = 86400 * 30; // 30 days

/**
 * Updates latency (exponential moving average) and cumulative cost
 * for a provider config in a single Redis pipeline.
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
    const d = new Date();
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const costKey = `cost:${configId}:${monthKey}`;
    pipeline.incrbyfloat(costKey, cost);
    pipeline.expire(costKey, 86400 * 35);
  }

  await pipeline.exec();
};
