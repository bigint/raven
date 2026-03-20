import type { Database } from "@raven/db";
import { PLAN_FEATURES, type Plan } from "@raven/types";
import type { Redis } from "ioredis";
import { PlanLimitError } from "@/lib/errors";
import { getOrgPlan } from "./plan-gate";

const getCurrentMonth = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export const checkPlanLimit = async (
  db: Database,
  redis: Redis,
  orgId: string
): Promise<void> => {
  const plan: Plan = await getOrgPlan(db, orgId, redis);

  if (plan === "enterprise") {
    return;
  }

  const features = PLAN_FEATURES[plan];
  const limit = features.maxRequestsPerMonth;

  if (limit === Number.POSITIVE_INFINITY) {
    return;
  }

  const month = getCurrentMonth();
  const redisKey = `plan:${orgId}:requests:${month}`;

  const currentValue = await redis.get(redisKey);
  const currentCount = currentValue ? Number.parseInt(currentValue, 10) : 0;

  if (currentCount >= limit) {
    throw new PlanLimitError(
      `Monthly request limit of ${limit.toLocaleString()} exceeded for ${plan} plan`,
      { currentCount, limit, plan }
    );
  }

  const newCount = await redis.incr(redisKey);

  if (newCount === 1) {
    await redis.expire(redisKey, 2_592_000);
  }
};
