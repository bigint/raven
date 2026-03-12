import type { Env } from '@raven/config'
import type { Database } from '@raven/db'
import { providerConfigs } from '@raven/db'
import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { encrypt } from '../../lib/crypto.js'
import { ConflictError, NotFoundError, ValidationError } from '../../lib/errors.js'

const createProviderSchema = z.object({
  provider: z.string().min(1),
  apiKey: z.string().min(1),
  isEnabled: z.boolean().default(true),
})

const updateProviderSchema = z.object({
  apiKey: z.string().min(1).optional(),
  isEnabled: z.boolean().optional(),
})

const maskApiKey = (encryptedKey: string): string => {
  // We don't decrypt — return a masked placeholder showing last 4 chars of the encrypted value
  const suffix = encryptedKey.slice(-4)
  return `****${suffix}`
}

export const createProvidersModule = (db: Database, env: Env) => {
  const app = new Hono()

  // GET / — List all providers for the org
  app.get('/', async (c) => {
    const orgId = c.get('orgId' as never) as string

    const providers = await db
      .select()
      .from(providerConfigs)
      .where(eq(providerConfigs.organizationId, orgId))

    return c.json(
      providers.map((p) => ({
        ...p,
        apiKey: maskApiKey(p.apiKey),
      })),
    )
  })

  // GET /:id — Get a single provider (without decrypted key)
  app.get('/:id', async (c) => {
    const orgId = c.get('orgId' as never) as string
    const id = c.req.param('id')

    const [provider] = await db
      .select()
      .from(providerConfigs)
      .where(and(eq(providerConfigs.id, id), eq(providerConfigs.organizationId, orgId)))
      .limit(1)

    if (!provider) {
      throw new NotFoundError('Provider not found')
    }

    return c.json({
      ...provider,
      apiKey: maskApiKey(provider.apiKey),
    })
  })

  // POST / — Create a provider config (encrypt API key)
  app.post('/', async (c) => {
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

    return c.json(
      {
        ...created!,
        apiKey: maskApiKey(created!.apiKey),
      },
      201,
    )
  })

  // PUT /:id — Update a provider (re-encrypt if key changed)
  app.put('/:id', async (c) => {
    const orgId = c.get('orgId' as never) as string
    const id = c.req.param('id')
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

    return c.json({
      ...updated!,
      apiKey: maskApiKey(updated!.apiKey),
    })
  })

  // DELETE /:id — Delete a provider config
  app.delete('/:id', async (c) => {
    const orgId = c.get('orgId' as never) as string
    const id = c.req.param('id')

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

    return c.json({ success: true })
  })

  return app
}
