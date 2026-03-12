import type { Database } from '@raven/db'
import { guardrailRules } from '@raven/db'
import { and, eq } from 'drizzle-orm'
import type { Context } from 'hono'
import { z } from 'zod'
import { NotFoundError, ValidationError } from '../../lib/errors.js'

const updateGuardrailSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['block_topics', 'pii_detection', 'content_filter', 'custom_regex']).optional(),
  config: z.record(z.unknown()).optional(),
  action: z.enum(['block', 'warn', 'log']).optional(),
  isEnabled: z.boolean().optional(),
  priority: z.number().int().min(0).optional(),
})

export const updateGuardrail = (db: Database) => async (c: Context) => {
  const orgId = c.get('orgId' as never) as string
  const id = c.req.param('id') as string
  const body = await c.req.json()
  const result = updateGuardrailSchema.safeParse(body)

  if (!result.success) {
    throw new ValidationError('Invalid request body', {
      errors: result.error.flatten().fieldErrors,
    })
  }

  const [existing] = await db
    .select({ id: guardrailRules.id })
    .from(guardrailRules)
    .where(and(eq(guardrailRules.id, id), eq(guardrailRules.organizationId, orgId)))
    .limit(1)

  if (!existing) {
    throw new NotFoundError('Guardrail rule not found')
  }

  const { name, type, config, action, isEnabled, priority } = result.data
  const updates: Partial<typeof guardrailRules.$inferInsert> = {}

  if (name !== undefined) {
    updates.name = name
  }

  if (type !== undefined) {
    updates.type = type
  }

  if (config !== undefined) {
    updates.config = config
  }

  if (action !== undefined) {
    updates.action = action
  }

  if (isEnabled !== undefined) {
    updates.isEnabled = isEnabled
  }

  if (priority !== undefined) {
    updates.priority = priority
  }

  const [updated] = await db
    .update(guardrailRules)
    .set(updates)
    .where(and(eq(guardrailRules.id, id), eq(guardrailRules.organizationId, orgId)))
    .returning()

  return c.json(updated)
}
