import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import type { Database } from '@raven/db'
import { guardrailRules } from '@raven/db'
import { NotFoundError, ValidationError } from '../../lib/errors.js'

const createGuardrailSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['block_topics', 'pii_detection', 'content_filter', 'custom_regex']),
  config: z.record(z.unknown()),
  action: z.enum(['block', 'warn', 'log']).default('log'),
  isEnabled: z.boolean().default(true),
  priority: z.number().int().min(0).default(0),
})

const updateGuardrailSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['block_topics', 'pii_detection', 'content_filter', 'custom_regex']).optional(),
  config: z.record(z.unknown()).optional(),
  action: z.enum(['block', 'warn', 'log']).optional(),
  isEnabled: z.boolean().optional(),
  priority: z.number().int().min(0).optional(),
})

export const createGuardrailsModule = (db: Database) => {
  const app = new Hono()

  // GET / — List guardrail rules for the org
  app.get('/', async (c) => {
    const orgId = c.get('orgId' as never) as string

    const rows = await db
      .select()
      .from(guardrailRules)
      .where(eq(guardrailRules.organizationId, orgId))

    return c.json(rows)
  })

  // POST / — Create a guardrail rule
  app.post('/', async (c) => {
    const orgId = c.get('orgId' as never) as string
    const body = await c.req.json()
    const result = createGuardrailSchema.safeParse(body)

    if (!result.success) {
      throw new ValidationError('Invalid request body', {
        errors: result.error.flatten().fieldErrors,
      })
    }

    const { name, type, config, action, isEnabled, priority } = result.data

    const [created] = await db
      .insert(guardrailRules)
      .values({
        organizationId: orgId,
        name,
        type,
        config,
        action,
        isEnabled,
        priority,
      })
      .returning()

    return c.json(created, 201)
  })

  // PUT /:id — Update a guardrail rule
  app.put('/:id', async (c) => {
    const orgId = c.get('orgId' as never) as string
    const id = c.req.param('id')
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
  })

  // DELETE /:id — Delete a guardrail rule
  app.delete('/:id', async (c) => {
    const orgId = c.get('orgId' as never) as string
    const id = c.req.param('id')

    const [existing] = await db
      .select({ id: guardrailRules.id })
      .from(guardrailRules)
      .where(and(eq(guardrailRules.id, id), eq(guardrailRules.organizationId, orgId)))
      .limit(1)

    if (!existing) {
      throw new NotFoundError('Guardrail rule not found')
    }

    await db
      .delete(guardrailRules)
      .where(and(eq(guardrailRules.id, id), eq(guardrailRules.organizationId, orgId)))

    return c.json({ success: true })
  })

  return app
}
