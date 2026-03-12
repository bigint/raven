import { createHash, randomBytes } from 'node:crypto'
import type { Database } from '@raven/db'
import { virtualKeys } from '@raven/db'
import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { NotFoundError, ValidationError } from '../../lib/errors.js'

const generateKey = (
  environment: 'live' | 'test',
): { key: string; hash: string; prefix: string } => {
  const random = randomBytes(24).toString('base64url')
  const key = `rk_${environment}_${random}`
  const hash = createHash('sha256').update(key).digest('hex')
  const prefix = key.substring(0, 12)
  return { key, hash, prefix }
}

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  environment: z.enum(['live', 'test']).default('live'),
  rateLimitRpm: z.number().int().positive().optional(),
  rateLimitRpd: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
})

const updateKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  rateLimitRpm: z.number().int().positive().nullable().optional(),
  rateLimitRpd: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
})

const safeKey = (k: typeof virtualKeys.$inferSelect) => ({
  id: k.id,
  organizationId: k.organizationId,
  teamId: k.teamId,
  name: k.name,
  keyPrefix: k.keyPrefix,
  environment: k.environment,
  rateLimitRpm: k.rateLimitRpm,
  rateLimitRpd: k.rateLimitRpd,
  isActive: k.isActive,
  expiresAt: k.expiresAt,
  createdAt: k.createdAt,
  lastUsedAt: k.lastUsedAt,
})

export const createKeysModule = (db: Database) => {
  const app = new Hono()

  // GET / — List all virtual keys for the org (never return full key, only prefix)
  app.get('/', async (c) => {
    const orgId = c.get('orgId' as never) as string

    const keys = await db.select().from(virtualKeys).where(eq(virtualKeys.organizationId, orgId))

    return c.json(keys.map(safeKey))
  })

  // GET /:id — Get a single key details
  app.get('/:id', async (c) => {
    const orgId = c.get('orgId' as never) as string
    const id = c.req.param('id')

    const [key] = await db
      .select()
      .from(virtualKeys)
      .where(and(eq(virtualKeys.id, id), eq(virtualKeys.organizationId, orgId)))
      .limit(1)

    if (!key) {
      throw new NotFoundError('Virtual key not found')
    }

    return c.json(safeKey(key))
  })

  // POST / — Create a new virtual key
  app.post('/', async (c) => {
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
    return c.json(
      {
        ...safeKey(created),
        key,
      },
      201,
    )
  })

  // PUT /:id — Update key metadata (name, rate limits, isActive)
  app.put('/:id', async (c) => {
    const orgId = c.get('orgId' as never) as string
    const id = c.req.param('id')
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

    return c.json(safeKey(updated))
  })

  // DELETE /:id — Delete a key
  app.delete('/:id', async (c) => {
    const orgId = c.get('orgId' as never) as string
    const id = c.req.param('id')

    const [existing] = await db
      .select({ id: virtualKeys.id })
      .from(virtualKeys)
      .where(and(eq(virtualKeys.id, id), eq(virtualKeys.organizationId, orgId)))
      .limit(1)

    if (!existing) {
      throw new NotFoundError('Virtual key not found')
    }

    await db
      .delete(virtualKeys)
      .where(and(eq(virtualKeys.id, id), eq(virtualKeys.organizationId, orgId)))

    return c.json({ success: true })
  })

  return app
}
