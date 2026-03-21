import type { Database } from "@raven/db";
import { sessions } from "@raven/db";
import { lt } from "drizzle-orm";

export const cleanupExpiredSessions = async (db: Database) => {
  const now = new Date();

  const deleted = await db
    .delete(sessions)
    .where(lt(sessions.expiresAt, now))
    .returning({ id: sessions.id });

  console.log(`Session cleanup: deleted ${deleted.length} expired sessions`);
};
