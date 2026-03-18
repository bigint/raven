import type { Database } from "@raven/db";
import { requestLogs, virtualKeys } from "@raven/db";
import {
  and,
  count,
  eq,
  isNotNull,
  isNull,
  max,
  min,
  sql,
  sum
} from "drizzle-orm";
import type { z } from "zod";
import { buildPaginationMeta, getOffset } from "@/lib/pagination";
import type { AppContextWithQuery } from "@/lib/types";

import { parseDateRange } from "./helpers";
import type { logsQuerySchema } from "./schema";

type Query = z.infer<typeof logsQuerySchema>;

export const getLogs =
  (db: Database) => async (c: AppContextWithQuery<Query>) => {
    const orgId = c.get("orgId");
    const query = c.req.valid("query");

    const { limit, page } = query;
    const offset = getOffset(page, limit);

    const dateConditions = parseDateRange(query.from, query.to);

    const where = and(
      eq(requestLogs.organizationId, orgId),
      isNotNull(requestLogs.sessionId),
      isNull(requestLogs.deletedAt),
      ...dateConditions,
      ...(query.virtualKeyId ? [eq(requestLogs.virtualKeyId, query.virtualKeyId)] : []),
      ...(query.model ? [eq(requestLogs.model, query.model)] : [])
    );

    const [rows, countResult] = await Promise.all([
      db
        .select({
          cachedTokens: sum(requestLogs.cachedTokens).as("cached_tokens_sum"),
          endTime: max(requestLogs.createdAt).as("end_time"),
          errorCount: count(
            sql`CASE WHEN ${requestLogs.statusCode} >= 400 THEN 1 END`
          ).as("error_count"),
          inputTokens: sum(requestLogs.inputTokens).as("input_tokens_sum"),
          keyName: virtualKeys.name,
          models:
            sql<string>`string_agg(DISTINCT ${requestLogs.model}, ',')`.as(
              "models"
            ),
          outputTokens: sum(requestLogs.outputTokens).as("output_tokens_sum"),
          reasoningTokens: sum(requestLogs.reasoningTokens).as(
            "reasoning_tokens_sum"
          ),
          requestCount: count().as("request_count"),
          sessionId: requestLogs.sessionId,
          startTime: min(requestLogs.createdAt).as("start_time"),
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
        .orderBy(sql`end_time DESC`)
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
        cachedTokens: Number(row.cachedTokens ?? 0),
        endTime: row.endTime,
        errorCount: Number(row.errorCount ?? 0),
        inputTokens: Number(row.inputTokens ?? 0),
        keyName: row.keyName ?? "Unknown",
        models: row.models ? row.models.split(",") : [],
        outputTokens: Number(row.outputTokens ?? 0),
        reasoningTokens: Number(row.reasoningTokens ?? 0),
        requestCount: Number(row.requestCount),
        sessionId: row.sessionId,
        startTime: row.startTime,
        toolUses: Number(row.toolUses ?? 0),
        userAgent: row.userAgent ?? null,
        virtualKeyId: row.virtualKeyId
      })),
      pagination: buildPaginationMeta({ limit, page }, Number(total))
    });
  };
