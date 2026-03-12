import type { Database } from '@raven/db'
import { virtualKeys } from '@raven/db'
import type { Context } from 'hono'
import { ValidationError } from '../../lib/errors.js'
import { createKeySchema, generateKey, safeKey } from './helpers.js'

export const createKey = (db: Database) => async (c: Context) => {
  const orgId = c.get('orgId' as never) as string
  const body = await c.req.json()
  const result = createKeySchema.safeParse(body)

  if (!result.success) {
    throw new ValidationError('Invalid request body', {
      errors: result.error.flatten().fieldErrors,
    })
  }

  const { name, environment, rateLimitRpm, rateLimitRpd, expiresAt } = result.data

  const { key, hash, prefix } = generateKey(environment)

  const [created] = await db
    .insert(virtualKeys)
    .values({
      organizationId: orgId,
      name,
      keyHash: hash,
      keyPrefix: prefix,
      environment,
      rateLimitRpm,
      rateLimitRpd,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    })
    .returning()

  // Return full plaintext key ONLY on creation
  const record = created as NonNullable<typeof created>
  return c.json(
    {
      ...safeKey(record),
      key,
    },
    201,
  )
}
