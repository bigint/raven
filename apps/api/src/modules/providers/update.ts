import type { Env } from '@raven/config'
import type { Database } from '@raven/db'
import { providerConfigs } from '@raven/db'
import { and, eq } from 'drizzle-orm'
import type { Context } from 'hono'
import { encrypt } from '../../lib/crypto.js'
import { NotFoundError, ValidationError } from '../../lib/errors.js'
import { maskApiKey, updateProviderSchema } from './helpers.js'

export const updateProvider = (db: Database, env: Env) => async (c: Context) => {
  const orgId = c.get('orgId' as never) as string
  const id = c.req.param('id') as string
  const body = await c.req.json()
  const result = updateProviderSchema.safeParse(body)

  if (!result.success) {
    throw new ValidationError('Invalid request body', {
      errors: result.error.flatten().fieldErrors,
    })
  }

  const [existing] = await db
    .select()
    .from(providerConfigs)
    .where(and(eq(providerConfigs.id, id), eq(providerConfigs.organizationId, orgId)))
    .limit(1)

  if (!existing) {
    throw new NotFoundError('Provider not found')
  }

  const { apiKey, isEnabled } = result.data

  const updates: Partial<typeof providerConfigs.$inferInsert> = {
    updatedAt: new Date(),
  }

  if (apiKey !== undefined) {
    updates.apiKey = encrypt(apiKey, env.ENCRYPTION_SECRET)
  }

  if (isEnabled !== undefined) {
    updates.isEnabled = isEnabled
  }

  const [updated] = await db
    .update(providerConfigs)
    .set(updates)
    .where(and(eq(providerConfigs.id, id), eq(providerConfigs.organizationId, orgId)))
    .returning()

  const record = updated as NonNullable<typeof updated>
  return c.json({
    ...record,
    apiKey: maskApiKey(record.apiKey),
  })
}
