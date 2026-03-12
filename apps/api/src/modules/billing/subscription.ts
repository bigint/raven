import type { Database } from '@raven/db'
import { subscriptions } from '@raven/db'
import { eq } from 'drizzle-orm'
import type { Context } from 'hono'
import { PLAN_DETAILS } from './plans.js'

export const getSubscription = (db: Database) => async (c: Context) => {
  const orgId = c.get('orgId' as never) as string

  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, orgId))
    .limit(1)

  if (!subscription) {
    return c.json(null)
  }

  const details = PLAN_DETAILS[subscription.plan]

  return c.json({
    planId: subscription.plan,
    planName: details?.name ?? subscription.plan,
    status: subscription.status,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    cancelAtPeriodEnd: false,
  })
}
