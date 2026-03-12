import type { Database } from '@raven/db'
import { organizations, subscriptions } from '@raven/db'
import { eq } from 'drizzle-orm'
import type { Context } from 'hono'
import { NotFoundError } from '../../lib/errors.js'

export const getSettings = (db: Database) => async (c: Context) => {
  const orgId = c.get('orgId' as never) as string
  const orgRole = c.get('orgRole' as never) as string

  const [org] = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      createdAt: organizations.createdAt,
    })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1)

  if (!org) {
    throw new NotFoundError('Organization not found')
  }

  const [sub] = await db
    .select({ plan: subscriptions.plan, status: subscriptions.status })
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, orgId))
    .limit(1)

  return c.json({
    id: org.id,
    name: org.name,
    slug: org.slug,
    plan: sub?.plan ?? 'free',
    subscriptionStatus: sub?.status ?? 'active',
    userRole: orgRole,
    createdAt: org.createdAt,
  })
}
