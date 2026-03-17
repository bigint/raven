import type { Database } from "@raven/db";
import { auditLogs } from "@raven/db";
import { and, desc, eq, gte, isNull, lte } from "drizzle-orm";
import type { z } from "zod";
import type { AppContextWithQuery } from "@/lib/types";
import { checkFeatureGate } from "@/modules/proxy/plan-gate";
import type { listQuerySchema } from "./schema";

type Query = z.infer<typeof listQuerySchema>;

export const listAuditLogs =
  (db: Database) => async (c: AppContextWithQuery<Query>) => {
    const orgId = c.get("orgId");

    await checkFeatureGate(db, orgId, "hasAuditLogs");

    const query = c.req.valid("query");

    const conditions = [
      eq(auditLogs.organizationId, orgId),
      isNull(auditLogs.deletedAt)
    ];

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
