import type { Database } from "@raven/db";
import { auditLogs, users } from "@raven/db";
import { desc, eq } from "drizzle-orm";
import type { Context } from "hono";
import { success } from "@/lib/response";

export const getAdminAuditLogs = (db: Database) => async (c: Context) => {
  const rows = await db
    .select({
      action: auditLogs.action,
      actorEmail: users.email,
      actorName: users.name,
      createdAt: auditLogs.createdAt,
      id: auditLogs.id,
      resourceType: auditLogs.resourceType
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(50);

  return success(c, rows);
};
