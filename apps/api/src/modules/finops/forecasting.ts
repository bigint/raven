import type { Redis } from "ioredis";

export interface CostForecast {
  period: string;
  currentSpend: number;
  projectedSpend: number;
  dailyRate: number;
  daysRemaining: number;
  budgetMax?: number;
  projectedOverrun: boolean;
  projectedOverrunDate?: string;
  confidence: number;
}

/** Forecast monthly costs based on daily spend trends */
export const forecastCosts = async (
  redis: Redis,
  orgId: string,
  budgetMax?: number
): Promise<CostForecast> => {
  const now = new Date();
  const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  // Get daily costs for current month
  const dailyCosts: number[] = [];
  for (let d = 1; d <= now.getUTCDate(); d++) {
    const dayKey = `${monthKey}-${String(d).padStart(2, "0")}`;
    const costKey = `finops:daily:${orgId}:${dayKey}`;
    const cost = await redis.get(costKey);
    dailyCosts.push(Number(cost ?? 0));
  }

  const currentSpend = dailyCosts.reduce((sum, c) => sum + c, 0);
  const daysWithData = dailyCosts.filter((c) => c > 0).length;
  const dailyRate = daysWithData > 0 ? currentSpend / daysWithData : 0;

  // Days remaining in month
  const lastDay = new Date(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1,
    0
  ).getUTCDate();
  const daysRemaining = lastDay - now.getUTCDate();
  const projectedSpend = currentSpend + dailyRate * daysRemaining;

  // Calculate confidence based on data points (full confidence after 2 weeks)
  const confidence = Math.min(daysWithData / 14, 1);

  // Overrun detection
  let projectedOverrun = false;
  let projectedOverrunDate: string | undefined;

  if (budgetMax && dailyRate > 0) {
    const daysUntilOverrun = (budgetMax - currentSpend) / dailyRate;
    if (daysUntilOverrun < daysRemaining && daysUntilOverrun > 0) {
      projectedOverrun = true;
      const overrunDate = new Date(now);
      overrunDate.setUTCDate(
        overrunDate.getUTCDate() + Math.ceil(daysUntilOverrun)
      );
      projectedOverrunDate = overrunDate.toISOString().split("T")[0];
    } else if (currentSpend >= budgetMax) {
      projectedOverrun = true;
      projectedOverrunDate = now.toISOString().split("T")[0];
    }
  }

  return {
    budgetMax,
    confidence,
    currentSpend,
    dailyRate,
    daysRemaining,
    period: monthKey,
    projectedOverrun,
    projectedOverrunDate,
    projectedSpend
  };
};

/** Track daily cost for forecasting */
export const trackDailyCost = async (
  redis: Redis,
  orgId: string,
  cost: number
): Promise<void> => {
  const now = new Date();
  const dayKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
  const costKey = `finops:daily:${orgId}:${dayKey}`;
  await redis.incrbyfloat(costKey, cost);
  await redis.expire(costKey, 90 * 86_400); // 90 days
};
