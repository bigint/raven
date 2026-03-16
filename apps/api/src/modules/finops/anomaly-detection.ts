import type { Redis } from "ioredis";

export interface CostAnomaly {
  detected: boolean;
  type: "cost_spike" | "recursive_loop" | "budget_drain" | "none";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  currentValue: number;
  baselineValue: number;
  multiplier: number;
}

/** Rolling average with Z-score detection using Welford's online algorithm */
export const detectCostAnomaly = async (
  redis: Redis,
  orgId: string,
  keyId: string,
  currentCost: number
): Promise<CostAnomaly> => {
  const statsKey = `finops:stats:${orgId}:${keyId}`;
  const raw = await redis.get(statsKey);

  if (!raw) {
    await redis.set(
      statsKey,
      JSON.stringify({
        count: 1,
        m2: 0,
        mean: currentCost,
        recentCosts: [currentCost]
      }),
      "EX",
      604_800
    );

    return {
      baselineValue: 0,
      currentValue: currentCost,
      description: "Building baseline",
      detected: false,
      multiplier: 0,
      severity: "low",
      type: "none"
    };
  }

  const stats = JSON.parse(raw) as {
    mean: number;
    m2: number;
    count: number;
    recentCosts: number[];
  };

  // Welford's online algorithm for running mean and variance
  const count = stats.count + 1;
  const delta = currentCost - stats.mean;
  const mean = stats.mean + delta / count;
  const delta2 = currentCost - mean;
  const m2 = stats.m2 + delta * delta2;
  const variance = count > 1 ? m2 / (count - 1) : 0;
  const stddev = Math.sqrt(variance);

  // Update stats
  stats.recentCosts.push(currentCost);
  if (stats.recentCosts.length > 100) {
    stats.recentCosts.shift();
  }

  await redis.set(
    statsKey,
    JSON.stringify({ count, m2, mean, recentCosts: stats.recentCosts }),
    "EX",
    604_800
  );

  // Z-score detection (only after sufficient samples)
  if (count > 20 && stddev > 0) {
    const zScore = (currentCost - mean) / stddev;

    if (zScore > 5) {
      return {
        baselineValue: mean,
        currentValue: currentCost,
        description: `Cost $${currentCost.toFixed(4)} is ${zScore.toFixed(1)} standard deviations above mean ($${mean.toFixed(4)})`,
        detected: true,
        multiplier: currentCost / mean,
        severity: "critical",
        type: "cost_spike"
      };
    }

    if (zScore > 3) {
      return {
        baselineValue: mean,
        currentValue: currentCost,
        description: `Cost $${currentCost.toFixed(4)} is ${zScore.toFixed(1)} standard deviations above mean ($${mean.toFixed(4)})`,
        detected: true,
        multiplier: currentCost / mean,
        severity: "high",
        type: "cost_spike"
      };
    }
  }

  // Recursive loop detection: same cost repeated rapidly
  const recentCosts = stats.recentCosts.slice(-10);
  const firstCost = recentCosts[0];
  if (recentCosts.length >= 5 && firstCost !== undefined) {
    const allSame = recentCosts.every((c) => Math.abs(c - firstCost) < 0.0001);
    if (allSame && firstCost > 0) {
      return {
        baselineValue: mean,
        currentValue: currentCost,
        description: `Detected ${recentCosts.length} identical requests costing $${firstCost.toFixed(4)} each`,
        detected: true,
        multiplier: 1,
        severity: "high",
        type: "recursive_loop"
      };
    }
  }

  return {
    baselineValue: mean,
    currentValue: currentCost,
    description: "Normal",
    detected: false,
    multiplier: currentCost / (mean || 1),
    severity: "low",
    type: "none"
  };
};
