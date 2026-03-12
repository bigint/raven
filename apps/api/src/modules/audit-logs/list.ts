import type { Database } from "@raven/db";
import { auditLogs } from "@raven/db";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import type { Context } from "hono";
import { z } from "zod";

const listQuerySchema = z.object({
  action: z.string().optional(),
  actorId: z.string().optional(),
  from: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  resourceType: z.string().optional(),
  to: z.coerce.date().optional()
});

export const listAuditLogs = (db: Database) => async (c: Context) => {
  const orgId = c.get("orgId" as never) as string;
  const query = listQuerySchema.parse(c.req.query());

  const conditions = [eq(auditLogs.organizationId, orgId)];

  if (query.action) {
    conditions.push(eq(auditLogs.action, query.action));
  }

  if (query.resourceType) {
    conditions.push(eq(auditLogs.resourceType, query.resourceType));
  }

  if (query.actorId) {
    conditions.push(eq(auditLogs.actorId, query.actorId));
  }

  if (query.from) {
    conditions.push(gte(auditLogs.createdAt, query.from));
  }

  if (query.to) {
    conditions.push(lte(auditLogs.createdAt, query.to));
  }

  const rows = await db
    .select()
    .from(auditLogs)
    .where(and(...conditions))
    .orderBy(desc(auditLogs.createdAt))
    .limit(query.limit)
    .offset(query.offset);

  return c.json(rows);
};
