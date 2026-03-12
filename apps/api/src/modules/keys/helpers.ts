import { createHash, randomBytes } from "node:crypto";
import type { virtualKeys } from "@raven/db";
import { z } from "zod";

export const generateKey = (
  environment: "live" | "test"
): { key: string; hash: string; prefix: string } => {
  const random = randomBytes(24).toString("base64url");
  const key = `rk_${environment}_${random}`;
  const hash = createHash("sha256").update(key).digest("hex");
  const prefix = key.substring(0, 12);
  return { hash, key, prefix };
};

export const safeKey = (k: typeof virtualKeys.$inferSelect) => ({
  createdAt: k.createdAt,
  environment: k.environment,
  expiresAt: k.expiresAt,
  id: k.id,
  isActive: k.isActive,
  keyPrefix: k.keyPrefix,
  lastUsedAt: k.lastUsedAt,
  name: k.name,
  organizationId: k.organizationId,
  rateLimitRpd: k.rateLimitRpd,
  rateLimitRpm: k.rateLimitRpm,
  teamId: k.teamId
});

export const createKeySchema = z.object({
  environment: z.enum(["live", "test"]).default("live"),
  expiresAt: z.string().datetime().optional(),
  name: z.string().min(1).max(100),
  rateLimitRpd: z.number().int().positive().optional(),
  rateLimitRpm: z.number().int().positive().optional()
});

export const updateKeySchema = z.object({
  isActive: z.boolean().optional(),
  name: z.string().min(1).max(100).optional(),
  rateLimitRpd: z.number().int().positive().nullable().optional(),
  rateLimitRpm: z.number().int().positive().nullable().optional()
});
