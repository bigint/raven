import type { Database } from "@raven/db";
import { PLAN_FEATURES, type Plan } from "@raven/types";
import { formatDate } from "date-fns";
import type { Redis } from "ioredis";
import { PlanLimitError } from "@/lib/errors";
import { getOrgPlan } from "./plan-gate";

const getCurrentMonth = (): string => formatDate(new Date(), "yyyy-MM");

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

  const count = await redis.incr(redisKey);

  if (count === 1) {
    await redis.expire(redisKey, 2_592_000);
  }

  if (count > limit) {
    throw new PlanLimitError(
      `Monthly request limit of ${limit.toLocaleString()} exceeded for ${plan} plan`,
      { currentCount: count, limit, plan }
    );
  }
};
