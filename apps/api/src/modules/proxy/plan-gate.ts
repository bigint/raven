import type { Database } from "@raven/db";
import { subscriptions } from "@raven/db";
import type { BooleanFeatureKey, NumericFeatureKey, Plan } from "@raven/types";
import { PLAN_FEATURES } from "@raven/types";
import { eq } from "drizzle-orm";
import { ForbiddenError } from "@/lib/errors";

export const getOrgPlan = async (
  db: Database,
  orgId: string
): Promise<Plan> => {
  const [sub] = await db
    .select({ plan: subscriptions.plan })
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, orgId))
    .limit(1);
  return (sub?.plan as Plan) ?? "free";
};

export const checkFeatureGate = async (
  db: Database,
  orgId: string,
  feature: BooleanFeatureKey
): Promise<void> => {
  const plan = await getOrgPlan(db, orgId);
  const features = PLAN_FEATURES[plan];
  if (!features[feature]) {
    throw new ForbiddenError(
      `Feature '${feature}' requires a higher plan. Current plan: ${plan}`
    );
  }
};

export const checkResourceLimit = async (
  db: Database,
  orgId: string,
  feature: NumericFeatureKey,
  currentCount: number
): Promise<void> => {
  const plan = await getOrgPlan(db, orgId);
  const limit = PLAN_FEATURES[plan][feature];
  if (currentCount >= limit) {
    throw new ForbiddenError(
      `Plan '${plan}' allows a maximum of ${limit} ${feature.replace("max", "").toLowerCase()}. Please upgrade to add more.`
    );
  }
};
