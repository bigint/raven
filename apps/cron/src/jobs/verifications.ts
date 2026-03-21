import type { Database } from "@raven/db";
import { verifications } from "@raven/db";
import { lt } from "drizzle-orm";

export const cleanupExpiredVerifications = async (db: Database) => {
  const now = new Date();

  const deleted = await db
    .delete(verifications)
    .where(lt(verifications.expiresAt, now))
    .returning({ id: verifications.id });

  console.log(
    `Verification cleanup: deleted ${deleted.length} expired verifications`
  );
};
