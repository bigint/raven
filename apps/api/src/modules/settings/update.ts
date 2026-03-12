import type { Database } from '@raven/db'
import { organizations, subscriptions } from '@raven/db'
import { eq } from 'drizzle-orm'
import type { Context } from 'hono'
import { z } from 'zod'
import { ForbiddenError, NotFoundError, ValidationError } from '../../lib/errors.js'
import { publishEvent } from '../../lib/events.js'

const updateOrgSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens only')
    .optional(),
})

export const updateSettings = (db: Database) => async (c: Context) => {
  const orgId = c.get('orgId' as never) as string
  const orgRole = c.get('orgRole' as never) as string

  if (orgRole !== 'owner' && orgRole !== 'admin') {
    throw new ForbiddenError('Only owners and admins can update organization settings')
  }

  const body = await c.req.json()
  const result = updateOrgSchema.safeParse(body)

  if (!result.success) {
    throw new ValidationError('Invalid request body', {
      errors: result.error.flatten().fieldErrors,
    })
  }

  const { name, slug } = result.data

  if (!name && !slug) {
    throw new ValidationError('At least one field must be provided')
  }

  const updates: Record<string, unknown> = {}
  if (name) updates.name = name
  if (slug) updates.slug = slug
  updates.updatedAt = new Date()

  const [updated] = await db
    .update(organizations)
    .set(updates)
    .where(eq(organizations.id, orgId))
    .returning()

  if (!updated) {
    throw new NotFoundError('Organization not found')
  }

  const [sub] = await db
    .select({ plan: subscriptions.plan, status: subscriptions.status })
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, orgId))
    .limit(1)

  const settings = {
    id: updated.id,
    name: updated.name,
    slug: updated.slug,
    plan: sub?.plan ?? 'free',
    subscriptionStatus: sub?.status ?? 'active',
    userRole: orgRole,
    createdAt: updated.createdAt,
  }
  void publishEvent(orgId, 'settings.updated', settings)
  return c.json(settings)
}
