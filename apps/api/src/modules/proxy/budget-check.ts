import type { Database } from "@raven/db";
import { budgets } from "@raven/db";
import { and, eq, inArray } from "drizzle-orm";
import type { Redis } from "ioredis";
import { BudgetExceededError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";

const PERIOD_TTL: Record<string, number> = {
  daily: 86_400,
  monthly: 2_592_000
};

const redisKey = (budgetId: string): string => `budget:${budgetId}:spent`;

export const checkBudgets = async (
  db: Database,
  redis: Redis,
  orgId: string,
  teamId: string | null,
  virtualKeyId: string
): Promise<void> => {
  const entityIds = [orgId, virtualKeyId];
  if (teamId) {
    entityIds.push(teamId);
  }

  const activeBudgets = await db
    .select()
    .from(budgets)
    .where(
      and(
        eq(budgets.organizationId, orgId),
        inArray(budgets.entityId, entityIds)
      )
    );

  if (activeBudgets.length === 0) {
    return;
  }

  const keys = activeBudgets.map((b) => redisKey(b.id));
  const spentValues = await redis.mget(...keys);

  for (let i = 0; i < activeBudgets.length; i++) {
    const budget = activeBudgets[i];
    if (!budget) continue;
    const spent = Number.parseFloat(spentValues[i] ?? "0");
    const limit = Number.parseFloat(budget.limitAmount);
    const threshold = Number.parseFloat(budget.alertThreshold);

    if (spent >= limit) {
      throw new BudgetExceededError(
        `Budget limit of $${limit.toFixed(2)} exceeded for ${budget.entityType} "${budget.entityId}"`,
        {
          budgetId: budget.id,
          entityId: budget.entityId,
          entityType: budget.entityType,
          limitAmount: limit,
          spent
        }
      );
    }

    if (threshold > 0 && spent >= threshold * limit) {
      void publishEvent(orgId, "budget.alert", {
        budgetId: budget.id,
        entityId: budget.entityId,
        entityType: budget.entityType,
        limitAmount: limit,
        spent,
        threshold
      });
    }
  }
};

export const incrementBudgetSpend = async (
  db: Database,
  redis: Redis,
  orgId: string,
  teamId: string | null,
  virtualKeyId: string,
  cost: number
): Promise<void> => {
  if (cost <= 0) {
    return;
  }

  const entityIds = [orgId, virtualKeyId];
  if (teamId) {
    entityIds.push(teamId);
  }

  const activeBudgets = await db
    .select({ id: budgets.id, period: budgets.period })
    .from(budgets)
    .where(
      and(
        eq(budgets.organizationId, orgId),
        inArray(budgets.entityId, entityIds)
      )
    );

  if (activeBudgets.length === 0) {
    return;
  }

  const pipeline = redis.pipeline();
  for (const budget of activeBudgets) {
    const key = redisKey(budget.id);
    const ttl = PERIOD_TTL[budget.period] ?? 2_592_000;
    pipeline.incrbyfloat(key, cost);
    pipeline.expire(key, ttl);
  }

  await pipeline.exec();
};
