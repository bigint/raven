import { z } from 'zod'

export const createProviderSchema = z.object({
  provider: z.string().min(1),
  apiKey: z.string().min(1),
  isEnabled: z.boolean().default(true),
})

export const updateProviderSchema = z.object({
  apiKey: z.string().min(1).optional(),
  isEnabled: z.boolean().optional(),
})

export const maskApiKey = (encryptedKey: string): string => {
  // We don't decrypt — return a masked placeholder showing last 4 chars of the encrypted value
  const suffix = encryptedKey.slice(-4)
  return `****${suffix}`
}
