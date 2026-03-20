import { createHash } from "node:crypto";
import type { Database } from "@raven/db";
import { virtualKeys } from "@raven/db";
import { eq } from "drizzle-orm";
import type { Redis } from "ioredis";
import { cachedQuery, cacheKeys } from "@/lib/cache-utils";
import { UnauthorizedError } from "@/lib/errors";

export type VirtualKey = Pick<
  typeof virtualKeys.$inferSelect,
  | "expiresAt"
  | "id"
  | "isActive"
  | "rateLimitRpd"
  | "rateLimitRpm"
>;

export interface AuthResult {
  virtualKey: VirtualKey;
}

const hashKey = (key: string): string =>
  createHash("sha256").update(key).digest("hex");

export const authenticateKey = async (
  db: Database,
  authHeader: string,
  redis?: Redis
): Promise<AuthResult> => {
  const match = authHeader.match(/^Bearer (rk_(?:live|test)_.+)$/);
  if (!match) {
    throw new UnauthorizedError("Missing or invalid Authorization header");
  }

  const rawKey = match[1] as string;
  const keyHash = hashKey(rawKey);

  const queryFn = async () => {
    const [vKey] = await db
      .select({
        expiresAt: virtualKeys.expiresAt,
        id: virtualKeys.id,
        isActive: virtualKeys.isActive,
        rateLimitRpd: virtualKeys.rateLimitRpd,
        rateLimitRpm: virtualKeys.rateLimitRpm
      })
      .from(virtualKeys)
      .where(eq(virtualKeys.keyHash, keyHash))
      .limit(1);
    return vKey ?? null;
  };

  const vKey = redis
    ? await cachedQuery(redis, cacheKeys.virtualKey(keyHash), 60, queryFn)
    : await queryFn();

  if (!vKey) {
    throw new UnauthorizedError("Invalid virtual key");
  }

  if (!vKey.isActive) {
    throw new UnauthorizedError("Virtual key is inactive");
  }

  if (vKey.expiresAt && vKey.expiresAt < new Date()) {
    throw new UnauthorizedError("Virtual key has expired");
  }

  return { virtualKey: vKey };
};
