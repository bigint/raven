import type { Database } from "@raven/db";
import { auditLogs, users } from "@raven/db";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import type { AuthEnv } from "@/lib/types";

export const createAuditLogsModule = (db: Database, _redis?: unknown) => {
  const app = new Hono<AuthEnv>();

  app.get("/", async (c) => {
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
      .orderBy(desc(auditLogs.createdAt))
      .limit(200);

    return c.json({ data: rows });
  });

  return app;
};
