import type { Database } from "@raven/db";
import { subscriptions } from "@raven/db";
import { PLAN_FEATURES, type Plan } from "@raven/types";
import { eq } from "drizzle-orm";
import type { Redis } from "ioredis";
import { PlanLimitError } from "@/lib/errors";

const getCurrentMonth = (): string => {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
};

export const checkPlanLimit = async (
  db: Database,
  redis: Redis,
  orgId: string
): Promise<void> => {
  const [subscription] = await db
    .select({ plan: subscriptions.plan, status: subscriptions.status })
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, orgId))
    .limit(1);

  const plan: Plan = subscription?.plan ?? "free";

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
