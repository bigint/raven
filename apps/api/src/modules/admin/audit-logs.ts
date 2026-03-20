import type { Database } from "@raven/db";
import { auditLogs, organizations, users } from "@raven/db";
import { and, desc, eq, isNull, lt } from "drizzle-orm";
import type { Context } from "hono";
import { z } from "zod";

const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50)
});

export const getAdminAuditLogs = (db: Database) => async (c: Context) => {
  const { cursor, limit } = paginationSchema.parse(c.req.query());

  const conditions = [isNull(auditLogs.deletedAt)];
  if (cursor) {
    conditions.push(lt(auditLogs.id, cursor));
  }

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
    .where(and(...conditions))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const data = rows.slice(0, limit);

  return c.json({
    data,
    hasMore,
    nextCursor: hasMore ? data[data.length - 1]?.id : undefined
  });
};
