import type { Database } from "@raven/db";
import { auditLogs, organizations, users } from "@raven/db";
import { desc, eq, isNull } from "drizzle-orm";
import type { Context } from "hono";

export const getAdminAuditLogs = (db: Database) => async (c: Context) => {
  const rows = await db
    .select({
      action: auditLogs.action,
      actorEmail: users.email,
      actorName: users.name,
      createdAt: auditLogs.createdAt,
      id: auditLogs.id,
      metadata: auditLogs.metadata,
      orgName: organizations.name,
      resourceId: auditLogs.resourceId,
      resourceType: auditLogs.resourceType
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorId))
    .leftJoin(organizations, eq(organizations.id, auditLogs.organizationId))
    .where(isNull(auditLogs.deletedAt))
    .orderBy(desc(auditLogs.createdAt))
    .limit(200);

  return c.json({ data: rows });
};
