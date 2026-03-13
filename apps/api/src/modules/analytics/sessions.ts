import type { Database } from "@raven/db";
import { requestLogs } from "@raven/db";
import { and, count, eq, isNotNull, max, min, sql, sum } from "drizzle-orm";
import type { z } from "zod";
import type { AppContext, AppContextWithQuery } from "@/lib/types";

import { parseDateRange } from "./helpers";
import type { sessionsQuerySchema } from "./schema";

type Query = z.infer<typeof sessionsQuerySchema>;

export const getSessions =
  (db: Database) => async (c: AppContextWithQuery<Query>) => {
    const orgId = c.get("orgId");
    const query = c.req.valid("query");

    const { limit, page } = query;
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
          models:
            sql<string>`string_agg(DISTINCT ${requestLogs.model}, ',')`.as(
              "session_models"
            ),
          providers:
            sql<string>`string_agg(DISTINCT ${requestLogs.provider}, ',')`.as(
              "providers"
            ),
          requestCount: count().as("request_count"),
          sessionId: requestLogs.sessionId,
          startTime: min(requestLogs.createdAt).as("start_time"),
          totalCachedTokens: sum(requestLogs.cachedTokens).as(
            "total_cached_tokens"
          ),
          totalCost: sum(requestLogs.cost).as("total_cost"),
          totalInputTokens: sum(requestLogs.inputTokens).as(
            "total_input_tokens"
          ),
          totalOutputTokens: sum(requestLogs.outputTokens).as(
            "total_output_tokens"
          ),
          totalReasoningTokens: sum(requestLogs.reasoningTokens).as(
            "total_reasoning_tokens"
          ),
          totalToolUses: sum(requestLogs.toolCount).as("total_tool_uses")
        })
        .from(requestLogs)
        .where(where)
        .groupBy(requestLogs.sessionId)
        .orderBy(sql`start_time DESC`)
        .limit(limit)
        .offset(offset),
      db
        .select({
          total: sql<number>`count(DISTINCT ${requestLogs.sessionId})`.as(
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
        models: row.models ? row.models.split(",") : [],
        providers: row.providers ? row.providers.split(",") : [],
        requestCount: Number(row.requestCount),
        sessionId: row.sessionId,
        startTime: row.startTime,
        totalCachedTokens: Number(row.totalCachedTokens ?? 0),
        totalCost: row.totalCost ?? "0",
        totalInputTokens: Number(row.totalInputTokens ?? 0),
        totalOutputTokens: Number(row.totalOutputTokens ?? 0),
        totalReasoningTokens: Number(row.totalReasoningTokens ?? 0),
        totalToolUses: Number(row.totalToolUses ?? 0)
      })),
      pagination: {
        limit,
        page,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit)
      }
    });
  };

export const getSessionById = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");
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
