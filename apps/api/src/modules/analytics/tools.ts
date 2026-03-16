import type { Database } from "@raven/db";
import { requestLogs, virtualKeys } from "@raven/db";
import { and, count, eq, gt, isNotNull, max, sql, sum } from "drizzle-orm";
import type { z } from "zod";
import { buildPaginationMeta, getOffset } from "@/lib/pagination";
import type { AppContextWithQuery } from "@/lib/types";

import { parseDateRange } from "./helpers";
import type { dateRangeQuerySchema, logsQuerySchema } from "./schema";

type DateQuery = z.infer<typeof dateRangeQuerySchema>;
type PagedQuery = z.infer<typeof logsQuerySchema>;

export const getToolStats =
  (db: Database) => async (c: AppContextWithQuery<DateQuery>) => {
    const orgId = c.get("orgId");
    const { from, to } = c.req.valid("query");

    const dateConditions = parseDateRange(from, to);
    const where = and(
      eq(requestLogs.organizationId, orgId),
      gt(requestLogs.toolCount, 0),
      ...dateConditions
    );

    const rows = await db
      .select({
        date: sql<string>`DATE(${requestLogs.createdAt})`.as("date"),
        totalRequests: count().as("total_requests"),
        totalToolUses: sum(requestLogs.toolCount).as("total_tool_uses")
      })
      .from(requestLogs)
      .where(where)
      .groupBy(sql`DATE(${requestLogs.createdAt})`)
      .orderBy(sql`DATE(${requestLogs.createdAt})`);

    return c.json({
      data: rows.map((row) => ({
        date: row.date,
        totalRequests: Number(row.totalRequests),
        totalToolUses: Number(row.totalToolUses ?? 0)
      }))
    });
  };

export const getToolSessions =
  (db: Database) => async (c: AppContextWithQuery<PagedQuery>) => {
    const orgId = c.get("orgId");
    const query = c.req.valid("query");

    const { limit, page } = query;
    const offset = getOffset(page, limit);

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
          keyName: virtualKeys.name,
          models:
            sql<string>`string_agg(DISTINCT ${requestLogs.model}, ',')`.as(
              "models"
            ),
          requestCount: count().as("request_count"),
          sessionId: requestLogs.sessionId,
          toolUses: sum(requestLogs.toolCount).as("tool_uses"),
          userAgent:
            sql<string>`(array_agg(${requestLogs.userAgent} ORDER BY ${requestLogs.createdAt} DESC))[1]`.as(
              "user_agent"
            ),
          virtualKeyId: requestLogs.virtualKeyId
        })
        .from(requestLogs)
        .leftJoin(virtualKeys, eq(requestLogs.virtualKeyId, virtualKeys.id))
        .where(where)
        .groupBy(
          requestLogs.sessionId,
          requestLogs.virtualKeyId,
          virtualKeys.name
        )
        .having(sql`SUM(${requestLogs.toolCount}) > 0`)
        .orderBy(sql`end_time DESC`)
        .limit(limit)
        .offset(offset),
      db
        .select({
          total:
            sql<number>`count(DISTINCT CASE WHEN ${requestLogs.toolCount} > 0 THEN ${requestLogs.sessionId} END)`.as(
              "total"
            )
        })
        .from(requestLogs)
        .where(where)
    ]);

    const total = countResult[0]?.total ?? 0;

    return c.json({
      data: rows.map((row) => ({
        endTime: row.endTime,
        keyName: row.keyName ?? "Unknown",
        models: row.models ? row.models.split(",") : [],
        requestCount: Number(row.requestCount),
        sessionId: row.sessionId,
        toolUses: Number(row.toolUses ?? 0),
        userAgent: row.userAgent ?? null,
        virtualKeyId: row.virtualKeyId
      })),
      pagination: buildPaginationMeta({ limit, page }, Number(total))
    });
  };
