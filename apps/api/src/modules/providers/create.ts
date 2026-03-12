import type { Env } from '@raven/config'
import type { Database } from '@raven/db'
import { providerConfigs } from '@raven/db'
import { and, eq } from 'drizzle-orm'
import type { Context } from 'hono'
import { encrypt } from '../../lib/crypto.js'
import { ConflictError, ValidationError } from '../../lib/errors.js'
import { createProviderSchema, maskApiKey } from './helpers.js'

export const createProvider = (db: Database, env: Env) => async (c: Context) => {
  const orgId = c.get('orgId' as never) as string
  const body = await c.req.json()
  const result = createProviderSchema.safeParse(body)

  if (!result.success) {
    throw new ValidationError('Invalid request body', {
      errors: result.error.flatten().fieldErrors,
    })
  }

  const { provider, apiKey, isEnabled } = result.data

  // Check for duplicate provider in org
  const [existing] = await db
    .select({ id: providerConfigs.id })
    .from(providerConfigs)
    .where(and(eq(providerConfigs.organizationId, orgId), eq(providerConfigs.provider, provider)))
    .limit(1)

  if (existing) {
    throw new ConflictError(`Provider '${provider}' is already configured for this organization`)
  }

  const encryptedKey = encrypt(apiKey, env.ENCRYPTION_SECRET)

  const [created] = await db
    .insert(providerConfigs)
    .values({
      organizationId: orgId,
      provider,
      apiKey: encryptedKey,
      isEnabled,
    })
    .returning()

  const record = created as NonNullable<typeof created>
  return c.json(
    {
      ...record,
      apiKey: maskApiKey(record.apiKey),
    },
    201,
  )
}
