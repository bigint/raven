import type { Database } from "@raven/db";
import { virtualKeys } from "@raven/db";
import { and, eq, isNotNull, lt } from "drizzle-orm";

export const deactivateExpiredKeys = async (db: Database) => {
  const now = new Date();

  const deactivated = await db
    .update(virtualKeys)
    .set({ isActive: false })
    .where(
      and(
        isNotNull(virtualKeys.expiresAt),
        lt(virtualKeys.expiresAt, now),
        eq(virtualKeys.isActive, true)
      )
    )
    .returning({ id: virtualKeys.id });

  console.log(
    `Key deactivation: deactivated ${deactivated.length} expired keys`
  );
};
