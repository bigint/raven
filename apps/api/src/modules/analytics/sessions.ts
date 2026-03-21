import type { Database } from "@raven/db";
import { requestLogs } from "@raven/db";
import { and, count, isNotNull, max, min, sql, sum } from "drizzle-orm";
import type { z } from "zod";
import { buildPaginationMeta, getOffset } from "@/lib/pagination";
import type { AuthContext, AuthContextWithQuery } from "@/lib/types";

import { parseDateRange } from "./helpers";
import type { sessionsQuerySchema } from "./schema";

type Query = z.infer<typeof sessionsQuerySchema>;

export const getSessions =
  (db: Database) => async (c: AuthContextWithQuery<Query>) => {
    const query = c.req.valid("query");

    const { limit, page } = query;
    const offset = getOffset(page, limit);

    const dateConditions = parseDateRange(query.from, query.to);

    const where = and(
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
      pagination: buildPaginationMeta({ limit, page }, Number(total))
    });
  };

export const getSessionById = (db: Database) => async (c: AuthContext) => {
  const sessionId = c.req.param("sessionId") ?? "";

  const rows = await db
    .select({
      cachedTokens: requestLogs.cachedTokens,
      cacheHit: requestLogs.cacheHit,
      cost: requestLogs.cost,
      createdAt: requestLogs.createdAt,
      id: requestLogs.id,
      inputTokens: requestLogs.inputTokens,
      isStarred: requestLogs.isStarred,
      latencyMs: requestLogs.latencyMs,
      method: requestLogs.method,
      model: requestLogs.model,
      outputTokens: requestLogs.outputTokens,
      path: requestLogs.path,
      provider: requestLogs.provider,
      reasoningTokens: requestLogs.reasoningTokens,
      sessionId: requestLogs.sessionId,
      statusCode: requestLogs.statusCode,
      toolCount: requestLogs.toolCount,
      toolNames: requestLogs.toolNames,
      userAgent: requestLogs.userAgent,
      virtualKeyId: requestLogs.virtualKeyId
    })
    .from(requestLogs)
    .where(
      sql`${requestLogs.sessionId} = ${sessionId}`
    )
    .orderBy(sql`${requestLogs.createdAt} ASC`);

  return c.json({ data: rows });
};
