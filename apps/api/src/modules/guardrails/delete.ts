import type { Database } from '@raven/db'
import { guardrailRules } from '@raven/db'
import { and, eq } from 'drizzle-orm'
import type { Context } from 'hono'
import { NotFoundError } from '../../lib/errors.js'
import { publishEvent } from '../../lib/events.js'

export const deleteGuardrail = (db: Database) => async (c: Context) => {
  const orgId = c.get('orgId' as never) as string
  const id = c.req.param('id') as string

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

  void publishEvent(orgId, 'guardrail.deleted', { id })
  return c.json({ success: true })
}
