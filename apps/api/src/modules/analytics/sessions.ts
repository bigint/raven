import type { Database } from "@raven/db";
import { requestLogs } from "@raven/db";
import { and, count, eq, isNotNull, max, min, sql, sum } from "drizzle-orm";
import type { Context } from "hono";

import { parseDateRange } from "./helpers";

export const getSessions = (db: Database) => async (c: Context) => {
  const orgId = c.get("orgId" as never) as string;
  const query = c.req.query();

  const page = Math.max(1, Number(query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
  const offset = (page - 1) * limit;

  const dateConditions = parseDateRange(query.from, query.to);

  const where = and(
    eq(requestLogs.organizationId, orgId),
    isNotNull(requestLogs.sessionId),
    ...dateConditions
  );

  const [rows, countResult] = await Promise.all([
    db
      .select({
        endTime: max(requestLogs.createdAt).as("end_time"),
        providers:
          sql<string>`string_agg(DISTINCT ${requestLogs.provider}, ',')`.as(
            "providers"
          ),
        requestCount: count().as("request_count"),
        sessionId: requestLogs.sessionId,
        startTime: min(requestLogs.createdAt).as("start_time"),
        totalCost: sum(requestLogs.cost).as("total_cost"),
        totalInputTokens: sum(requestLogs.inputTokens).as("total_input_tokens"),
        totalOutputTokens: sum(requestLogs.outputTokens).as(
          "total_output_tokens"
        )
      })
      .from(requestLogs)
      .where(where)
      .groupBy(requestLogs.sessionId)
      .orderBy(sql`start_time DESC`)
      .limit(limit)
      .offset(offset),
    db
      .select({
        total: sql<number>`count(DISTINCT ${requestLogs.sessionId})`.as("total")
      })
      .from(requestLogs)
      .where(where)
  ]);

  const total = countResult[0]?.total ?? 0;

  return c.json({
    data: rows.map((row) => ({
      endTime: row.endTime,
      providers: row.providers ? row.providers.split(",") : [],
      requestCount: Number(row.requestCount),
      sessionId: row.sessionId,
      startTime: row.startTime,
      totalCost: row.totalCost ?? "0",
      totalInputTokens: Number(row.totalInputTokens ?? 0),
      totalOutputTokens: Number(row.totalOutputTokens ?? 0)
    })),
    pagination: {
      limit,
      page,
      total: Number(total),
      totalPages: Math.ceil(Number(total) / limit)
    }
  });
};

export const getSessionById = (db: Database) => async (c: Context) => {
  const orgId = c.get("orgId" as never) as string;
  const sessionId = c.req.param("sessionId") ?? "";

  const rows = await db
    .select()
    .from(requestLogs)
    .where(
      and(
        eq(requestLogs.organizationId, orgId),
        sql`${requestLogs.sessionId} = ${sessionId}`
      )
    )
    .orderBy(sql`${requestLogs.createdAt} ASC`);

  return c.json({ data: rows });
};
