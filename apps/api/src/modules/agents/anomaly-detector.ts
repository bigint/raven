import type { Redis } from "ioredis";

export interface AnomalyResult {
  detected: boolean;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  recommendedAction: "alert" | "throttle" | "suspend";
}

interface AgentBaseline {
  avgCost: number;
  avgTokens: number;
  avgTools: number;
  count: number;
}

interface AgentEvent {
  cost: number;
  tokenCount: number;
  toolCalls: number;
}

const BASELINE_TTL = 604800; // 7 days
const MIN_BASELINE_COUNT = 10;
const COST_SPIKE_THRESHOLD = 5;
const TOKEN_EXPLOSION_THRESHOLD = 10;

export const detectAgentAnomaly = async (
  redis: Redis,
  agentId: string,
  event: AgentEvent
): Promise<AnomalyResult> => {
  const baselineKey = `agent:baseline:${agentId}`;
  const raw = await redis.get(baselineKey);

  if (!raw) {
    // No baseline yet - store this as initial data point
    await redis.set(
      baselineKey,
      JSON.stringify({
        avgCost: event.cost,
        avgTokens: event.tokenCount,
        avgTools: event.toolCalls,
        count: 1
      }),
      "EX",
      BASELINE_TTL
    );
    return {
      description: "Building baseline",
      detected: false,
      recommendedAction: "alert",
      severity: "low",
      type: "none"
    };
  }

  const baseline: AgentBaseline = JSON.parse(raw);

  // Check for cost spike (>5x average)
  if (
    event.cost > baseline.avgCost * COST_SPIKE_THRESHOLD &&
    baseline.count > MIN_BASELINE_COUNT
  ) {
    return {
      description: `Cost ${event.cost.toFixed(4)} is ${(event.cost / baseline.avgCost).toFixed(1)}x the average`,
      detected: true,
      recommendedAction: "throttle",
      severity: "high",
      type: "cost_spike"
    };
  }

  // Check for token explosion (>10x average)
  if (
    event.tokenCount > baseline.avgTokens * TOKEN_EXPLOSION_THRESHOLD &&
    baseline.count > MIN_BASELINE_COUNT
  ) {
    return {
      description: `Token count ${event.tokenCount} is ${(event.tokenCount / baseline.avgTokens).toFixed(1)}x the average`,
      detected: true,
      recommendedAction: "suspend",
      severity: "critical",
      type: "token_explosion"
    };
  }

  // Update rolling average
  const newCount = baseline.count + 1;
  baseline.avgCost =
    (baseline.avgCost * baseline.count + event.cost) / newCount;
  baseline.avgTokens =
    (baseline.avgTokens * baseline.count + event.tokenCount) / newCount;
  baseline.avgTools =
    (baseline.avgTools * baseline.count + event.toolCalls) / newCount;
  baseline.count = newCount;
  await redis.set(baselineKey, JSON.stringify(baseline), "EX", BASELINE_TTL);

  return {
    description: "Within baseline",
    detected: false,
    recommendedAction: "alert",
    severity: "low",
    type: "none"
  };
};
