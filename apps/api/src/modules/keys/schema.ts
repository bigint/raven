import { z } from "zod";

export const createKeySchema = z.object({
  environment: z.enum(["live", "test"]).default("live"),
  expiresAt: z.string().datetime().optional(),
  name: z.string().min(1).max(100),
  rateLimitRpd: z.number().int().positive().optional(),
  rateLimitRpm: z.number().int().positive().optional()
});

export const updateKeySchema = z.object({
  expiresAt: z.string().datetime().nullable().optional(),
  isActive: z.boolean().optional(),
  name: z.string().min(1).max(100).optional(),
  rateLimitRpd: z.number().int().positive().nullable().optional(),
  rateLimitRpm: z.number().int().positive().nullable().optional()
});
