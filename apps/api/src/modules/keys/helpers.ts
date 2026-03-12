import { createHash, randomBytes } from 'node:crypto'
import type { virtualKeys } from '@raven/db'
import { z } from 'zod'

export const generateKey = (
  environment: 'live' | 'test',
): { key: string; hash: string; prefix: string } => {
  const random = randomBytes(24).toString('base64url')
  const key = `rk_${environment}_${random}`
  const hash = createHash('sha256').update(key).digest('hex')
  const prefix = key.substring(0, 12)
  return { key, hash, prefix }
}

export const safeKey = (k: typeof virtualKeys.$inferSelect) => ({
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

export const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  environment: z.enum(['live', 'test']).default('live'),
  rateLimitRpm: z.number().int().positive().optional(),
  rateLimitRpd: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
})

export const updateKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  rateLimitRpm: z.number().int().positive().nullable().optional(),
  rateLimitRpd: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
})
