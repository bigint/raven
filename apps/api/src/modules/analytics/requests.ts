import type { Database } from "@raven/db";
import { requestLogs } from "@raven/db";
import { and, count, eq, sql } from "drizzle-orm";
import type { Context } from "hono";

import { parseDateRange } from "./helpers.js";

export const getRequests = (db: Database) => async (c: Context) => {
  const orgId = c.get("orgId" as never) as string;
  const query = c.req.query();

  const page = Math.max(1, Number(query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
  const offset = (page - 1) * limit;

  const dateConditions = parseDateRange(query.from, query.to);

  const filterConditions = [
    eq(requestLogs.organizationId, orgId),
    ...dateConditions
  ];

  if (query.provider) {
    filterConditions.push(eq(requestLogs.provider, query.provider));
  }

  if (query.model) {
    filterConditions.push(eq(requestLogs.model, query.model));
  }

  if (query.statusCode) {
    const code = Number(query.statusCode);
    if (!Number.isNaN(code)) {
      filterConditions.push(eq(requestLogs.statusCode, code));
    }
  }

  if (query.virtualKeyId) {
    filterConditions.push(eq(requestLogs.virtualKeyId, query.virtualKeyId));
  }

  const where = and(...filterConditions);

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(requestLogs)
      .where(where)
      .orderBy(sql`${requestLogs.createdAt} DESC`)
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(requestLogs).where(where)
  ]);

  const total = countResult[0]?.total ?? 0;

  return c.json({
    data: rows,
    pagination: {
      limit,
      page,
      total: Number(total),
      totalPages: Math.ceil(Number(total) / limit)
    }
  });
};
