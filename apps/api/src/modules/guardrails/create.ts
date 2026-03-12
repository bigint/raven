import type { Database } from '@raven/db'
import { guardrailRules } from '@raven/db'
import type { Context } from 'hono'
import { z } from 'zod'
import { ValidationError } from '../../lib/errors.js'
import { publishEvent } from '../../lib/events.js'

const createGuardrailSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['block_topics', 'pii_detection', 'content_filter', 'custom_regex']),
  config: z.record(z.string(), z.unknown()),
  action: z.enum(['block', 'warn', 'log']).default('log'),
  isEnabled: z.boolean().default(true),
  priority: z.number().int().min(0).default(0),
})

export const createGuardrail = (db: Database) => async (c: Context) => {
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

  void publishEvent(orgId, 'guardrail.created', created)
  return c.json(created, 201)
}
