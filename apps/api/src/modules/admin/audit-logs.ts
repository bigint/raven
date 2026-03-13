import type { Database } from "@raven/db";
import { auditLogs, organizations, users } from "@raven/db";
import { desc, eq } from "drizzle-orm";
import type { Context } from "hono";

export const getAdminAuditLogs = (db: Database) => async (c: Context) => {
  const rows = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      resourceType: auditLogs.resourceType,
      resourceId: auditLogs.resourceId,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt,
      actorName: users.name,
      actorEmail: users.email,
      orgName: organizations.name
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorId))
    .leftJoin(
      organizations,
      eq(organizations.id, auditLogs.organizationId)
    )
    .orderBy(desc(auditLogs.createdAt))
    .limit(200);

  return c.json({ data: rows });
};
