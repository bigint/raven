import type { Database } from "@raven/db";
import { subscriptions } from "@raven/db";
import { eq } from "drizzle-orm";
import type { AppContext } from "@/lib/types";
import { PLAN_DETAILS } from "./plans";

export const getSubscription = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");

  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, orgId))
    .limit(1);

  if (!subscription) {
    return c.json(null);
  }

  const details = PLAN_DETAILS[subscription.plan];

  return c.json({
    cancelAtPeriodEnd: false,
    currentPeriodEnd: subscription.currentPeriodEnd,
    currentPeriodStart: subscription.currentPeriodStart,
    planId: subscription.plan,
    planName: details?.name ?? subscription.plan,
    status: subscription.status
  });
};
