import type { Database } from "@raven/db";
import { invitations } from "@raven/db";
import { and, isNull, lt } from "drizzle-orm";

export const cleanupExpiredInvitations = async (db: Database) => {
  const now = new Date();

  const deleted = await db
    .delete(invitations)
    .where(and(lt(invitations.expiresAt, now), isNull(invitations.acceptedAt)))
    .returning({ id: invitations.id });

  console.log(
    `Invitation cleanup: deleted ${deleted.length} expired invitations`
  );
};
