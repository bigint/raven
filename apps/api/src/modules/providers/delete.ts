import type { Database } from '@raven/db'
import { providerConfigs } from '@raven/db'
import { and, eq } from 'drizzle-orm'
import type { Context } from 'hono'
import { NotFoundError } from '../../lib/errors.js'
import { publishEvent } from '../../lib/events.js'

export const deleteProvider = (db: Database) => async (c: Context) => {
  const orgId = c.get('orgId' as never) as string
  const id = c.req.param('id') as string

  const [existing] = await db
    .select({ id: providerConfigs.id })
    .from(providerConfigs)
    .where(and(eq(providerConfigs.id, id), eq(providerConfigs.organizationId, orgId)))
    .limit(1)

  if (!existing) {
    throw new NotFoundError('Provider not found')
  }

  await db
    .delete(providerConfigs)
    .where(and(eq(providerConfigs.id, id), eq(providerConfigs.organizationId, orgId)))

  void publishEvent(orgId, 'provider.deleted', { id })
  return c.json({ success: true })
}
