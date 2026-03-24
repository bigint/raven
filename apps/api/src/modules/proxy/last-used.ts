import type { Database } from "@raven/db";
import { virtualKeys } from "@raven/db";
import { eq } from "drizzle-orm";
import type { Redis } from "ioredis";
import { log } from "@/lib/logger";

export const updateLastUsed = (redis: Redis, keyId: string): void => {
  redis
    .set(`lastused:${keyId}`, Date.now().toString(), "EX", 300)
    .catch((err) => log.error("Failed to buffer lastUsedAt", err));
};

/**
 * Flush all buffered lastUsedAt timestamps to the database.
 * Call this periodically (e.g., every 60 seconds).
 */
export const flushLastUsed = async (
  db: Database,
  redis: Redis
): Promise<void> => {
  const stream = redis.scanStream({ count: 100, match: "lastused:*" });

  const updates: { keyId: string; timestamp: Date }[] = [];
  const keysToDelete: string[] = [];

  for await (const keys of stream) {
    if (!Array.isArray(keys) || keys.length === 0) continue;
    const values = await redis.mget(...(keys as string[]));
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i] as string;
      const val = values[i];
      if (!val) continue;
      const keyId = key.replace("lastused:", "");
      updates.push({ keyId, timestamp: new Date(Number.parseInt(val, 10)) });
      keysToDelete.push(key);
    }
  }

  if (updates.length === 0) return;

  // Write to DB first, then delete Redis keys only on success
  await Promise.all(
    updates.map(({ keyId, timestamp }) =>
      db
        .update(virtualKeys)
        .set({ lastUsedAt: timestamp })
        .where(eq(virtualKeys.id, keyId))
        .catch((err) => log.error("Failed to flush lastUsedAt", err))
    )
  );

  if (keysToDelete.length > 0) {
    await redis
      .del(...keysToDelete)
      .catch((err) => log.error("Failed to delete lastUsed Redis keys", err));
  }
};
