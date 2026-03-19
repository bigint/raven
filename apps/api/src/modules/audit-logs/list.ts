import type { Database } from "@raven/db";
import { auditLogs, users } from "@raven/db";
import { and, desc, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import type { AppContext } from "@/lib/types";

export const createAuditLogsModule = (db: Database) => {
  const app = new Hono();

  app.get("/", async (c: AppContext) => {
    const orgId = c.get("orgId");

    const rows = await db
      .select({
        action: auditLogs.action,
        actorEmail: users.email,
        actorName: users.name,
        createdAt: auditLogs.createdAt,
        id: auditLogs.id,
        metadata: auditLogs.metadata,
        resourceId: auditLogs.resourceId,
        resourceType: auditLogs.resourceType
      })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.actorId))
      .where(
        and(eq(auditLogs.organizationId, orgId), isNull(auditLogs.deletedAt))
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(200);

    return c.json({ data: rows });
  });

  return app;
};
