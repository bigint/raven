import type { Redis } from "ioredis";

export interface CostAttribution {
  totalCost: number;
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  breakdown: Array<{
    key: string;
    value: string;
    cost: number;
    requests: number;
    inputTokens: number;
    outputTokens: number;
    percentage: number;
  }>;
}

/** Track cost by arbitrary metadata tags (customer, feature, team, model, etc.) */
export const trackCostAttribution = async (
  redis: Redis,
  orgId: string,
  tags: Record<string, string>,
  cost: number,
  inputTokens: number,
  outputTokens: number
): Promise<void> => {
  const now = new Date();
  const dayKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;

  for (const [key, value] of Object.entries(tags)) {
    const redisKey = `finops:${orgId}:${dayKey}:${key}:${value}`;
    const pipeline = redis.pipeline();
    pipeline.hincrbyfloat(redisKey, "cost", cost);
    pipeline.hincrby(redisKey, "requests", 1);
    pipeline.hincrby(redisKey, "input_tokens", inputTokens);
    pipeline.hincrby(redisKey, "output_tokens", outputTokens);
    pipeline.expire(redisKey, 90 * 86_400); // 90 days retention
    await pipeline.exec();
  }
};

/** Get cost breakdown by a specific tag key over a date range */
export const getCostBreakdown = async (
  redis: Redis,
  orgId: string,
  tagKey: string,
  startDate: string,
  endDate: string
): Promise<CostAttribution> => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days: string[] = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
    );
  }

  // Scan for all tag values across the date range
  const tagValues = new Map<
    string,
    {
      cost: number;
      requests: number;
      inputTokens: number;
      outputTokens: number;
    }
  >();

  for (const day of days) {
    const pattern = `finops:${orgId}:${day}:${tagKey}:*`;
    let cursor = "0";
    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100
      );
      cursor = nextCursor;

      for (const key of keys) {
        const value = key.split(":").pop() ?? "";
        const data = await redis.hgetall(key);
        const existing = tagValues.get(value) ?? {
          cost: 0,
          inputTokens: 0,
          outputTokens: 0,
          requests: 0
        };
        existing.cost += Number(data.cost ?? 0);
        existing.requests += Number(data.requests ?? 0);
        existing.inputTokens += Number(data.input_tokens ?? 0);
        existing.outputTokens += Number(data.output_tokens ?? 0);
        tagValues.set(value, existing);
      }
    } while (cursor !== "0");
  }

  let totalCost = 0;
  let totalRequests = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (const data of tagValues.values()) {
    totalCost += data.cost;
    totalRequests += data.requests;
    totalInputTokens += data.inputTokens;
    totalOutputTokens += data.outputTokens;
  }

  const breakdown = [...tagValues.entries()].map(([value, data]) => ({
    cost: data.cost,
    inputTokens: data.inputTokens,
    key: tagKey,
    outputTokens: data.outputTokens,
    percentage: totalCost > 0 ? (data.cost / totalCost) * 100 : 0,
    requests: data.requests,
    value
  }));

  breakdown.sort((a, b) => b.cost - a.cost);

  return {
    breakdown,
    totalCost,
    totalInputTokens,
    totalOutputTokens,
    totalRequests
  };
};
