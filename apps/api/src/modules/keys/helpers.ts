import { createHash, randomBytes } from "node:crypto";
import type { virtualKeys } from "@raven/db";

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
  rateLimitRpd: k.rateLimitRpd,
  rateLimitRpm: k.rateLimitRpm
});
