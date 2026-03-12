import { createHash } from "node:crypto";
import type { Database } from "@raven/db";
import { virtualKeys } from "@raven/db";
import { eq } from "drizzle-orm";
import { UnauthorizedError } from "@/lib/errors";

export type VirtualKey = typeof virtualKeys.$inferSelect;

export interface AuthResult {
  virtualKey: VirtualKey;
}

const hashKey = (key: string): string =>
  createHash("sha256").update(key).digest("hex");

export const authenticateKey = async (
  db: Database,
  authHeader: string
): Promise<AuthResult> => {
  const match = authHeader.match(/^Bearer (rk_(?:live|test)_.+)$/);
  if (!match) {
    throw new UnauthorizedError("Missing or invalid Authorization header");
  }

  const rawKey = match[1] as string;
  const keyHash = hashKey(rawKey);

  const [vKey] = await db
    .select()
    .from(virtualKeys)
    .where(eq(virtualKeys.keyHash, keyHash))
    .limit(1);

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
