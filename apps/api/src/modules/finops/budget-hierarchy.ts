import type { Redis } from "ioredis";

export interface BudgetNode {
  entityType: "organization" | "team" | "key" | "agent";
  entityId: string;
  maxBudget: number;
  currentSpend: number;
  period: "daily" | "weekly" | "monthly";
  children: BudgetNode[];
}

/** Check budget hierarchy from org > team > key > agent, blocking on first breach */
export const checkBudgetHierarchy = async (
  redis: Redis,
  orgId: string,
  teamId: string | null,
  keyId: string,
  agentId: string | null,
  estimatedCost: number
): Promise<{ allowed: boolean; blockedBy?: string; reason?: string }> => {
  const checks = [
    { id: orgId, type: "organization" },
    ...(teamId ? [{ id: teamId, type: "team" }] : []),
    { id: keyId, type: "key" },
    ...(agentId ? [{ id: agentId, type: "agent" }] : [])
  ];

  for (const check of checks) {
    const budgetKey = `budget:${check.type}:${check.id}`;
    const data = await redis.hgetall(budgetKey);

    if (data.max_budget) {
      const maxBudget = Number(data.max_budget);
      const currentSpend = Number(data.current_spend ?? 0);

      if (currentSpend + estimatedCost > maxBudget) {
        return {
          allowed: false,
          blockedBy: `${check.type}:${check.id}`,
          reason: `Budget exceeded for ${check.type}. Current: $${currentSpend.toFixed(2)}, Max: $${maxBudget.toFixed(2)}, Estimated: $${estimatedCost.toFixed(4)}`
        };
      }
    }
  }

  return { allowed: true };
};

/** Update spend across all levels of the budget hierarchy */
export const updateBudgetSpend = async (
  redis: Redis,
  orgId: string,
  teamId: string | null,
  keyId: string,
  agentId: string | null,
  cost: number
): Promise<void> => {
  const entities = [
    { id: orgId, type: "organization" },
    ...(teamId ? [{ id: teamId, type: "team" }] : []),
    { id: keyId, type: "key" },
    ...(agentId ? [{ id: agentId, type: "agent" }] : [])
  ];

  const pipeline = redis.pipeline();
  for (const entity of entities) {
    const key = `budget:${entity.type}:${entity.id}`;
    pipeline.hincrbyfloat(key, "current_spend", cost);
  }
  await pipeline.exec();
};
