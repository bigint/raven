import type { Database } from '@raven/db'
import { virtualKeys } from '@raven/db'
import { and, eq } from 'drizzle-orm'
import type { Context } from 'hono'
import { NotFoundError, ValidationError } from '../../lib/errors.js'
import { safeKey, updateKeySchema } from './helpers.js'

export const updateKey = (db: Database) => async (c: Context) => {
  const orgId = c.get('orgId' as never) as string
  const id = c.req.param('id') as string
  const body = await c.req.json()
  const result = updateKeySchema.safeParse(body)

  if (!result.success) {
    throw new ValidationError('Invalid request body', {
      errors: result.error.flatten().fieldErrors,
    })
  }

  const [existing] = await db
    .select({ id: virtualKeys.id })
    .from(virtualKeys)
    .where(and(eq(virtualKeys.id, id), eq(virtualKeys.organizationId, orgId)))
    .limit(1)

  if (!existing) {
    throw new NotFoundError('Virtual key not found')
  }

  const { name, rateLimitRpm, rateLimitRpd, isActive } = result.data

  const updates: Partial<typeof virtualKeys.$inferInsert> = {}

  if (name !== undefined) {
    updates.name = name
  }

  if (rateLimitRpm !== undefined) {
    updates.rateLimitRpm = rateLimitRpm
  }

  if (rateLimitRpd !== undefined) {
    updates.rateLimitRpd = rateLimitRpd
  }

  if (isActive !== undefined) {
    updates.isActive = isActive
  }

  const [updated] = await db
    .update(virtualKeys)
    .set(updates)
    .where(and(eq(virtualKeys.id, id), eq(virtualKeys.organizationId, orgId)))
    .returning()

  return c.json(safeKey(updated as NonNullable<typeof updated>))
}
