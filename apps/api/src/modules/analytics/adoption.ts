import type { Database } from "@raven/db";
import { requestLogs, virtualKeys } from "@raven/db";
import { and, count, eq, isNull, sql, sum } from "drizzle-orm";
import type { z } from "zod";
import type { AppContextWithQuery } from "@/lib/types";

import { parseDateRange } from "./helpers";
import type { adoptionQuerySchema, dateRangeQuerySchema } from "./schema";

type DateQuery = z.infer<typeof dateRangeQuerySchema>;
type AdoptionQuery = z.infer<typeof adoptionQuerySchema>;

/** Daily token breakdown for stacked chart */
export const getAdoptionChart =
  (db: Database) => async (c: AppContextWithQuery<DateQuery>) => {
    const orgId = c.get("orgId");
    const { from, to } = c.req.valid("query");

    const dateConditions = parseDateRange(from, to);
    const where = and(
      eq(requestLogs.organizationId, orgId),
      isNull(requestLogs.deletedAt),
      ...dateConditions
    );

    const rows = await db
      .select({
        cached: sum(requestLogs.cachedTokens).as("cached"),
        date: sql<string>`DATE(${requestLogs.createdAt})`.as("date"),
        input: sum(requestLogs.inputTokens).as("input"),
        output: sum(requestLogs.outputTokens).as("output"),
        reasoning: sum(requestLogs.reasoningTokens).as("reasoning")
      })
      .from(requestLogs)
      .where(where)
      .groupBy(sql`DATE(${requestLogs.createdAt})`)
      .orderBy(sql`DATE(${requestLogs.createdAt})`);

    return c.json({
      data: rows.map((row) => ({
        cached: Number(row.cached ?? 0),
        date: row.date,
        input: Number(row.input ?? 0),
        output: Number(row.output ?? 0),
        reasoning: Number(row.reasoning ?? 0)
      }))
    });
  };

/** Per-key or per-model usage breakdown */
export const getAdoptionBreakdown =
  (db: Database) => async (c: AppContextWithQuery<AdoptionQuery>) => {
    const orgId = c.get("orgId");
    const { from, to, groupBy } = c.req.valid("query");

    const dateConditions = parseDateRange(from, to);
    const where = and(
      eq(requestLogs.organizationId, orgId),
      isNull(requestLogs.deletedAt),
      ...dateConditions
    );

    if (groupBy === "model") {
      const rows = await db
        .select({
          cachedTokens: sum(requestLogs.cachedTokens),
          inputTokens: sum(requestLogs.inputTokens),
          label: requestLogs.model,
          outputTokens: sum(requestLogs.outputTokens),
          reasoningTokens: sum(requestLogs.reasoningTokens),
          requests: count()
        })
        .from(requestLogs)
        .where(where)
        .groupBy(requestLogs.model)
        .orderBy(sql`${sum(requestLogs.inputTokens)} DESC`);

      return c.json({
        data: rows.map((row) => ({
          cachedTokens: Number(row.cachedTokens ?? 0),
          inputTokens: Number(row.inputTokens ?? 0),
          label: row.label,
          outputTokens: Number(row.outputTokens ?? 0),
          reasoningTokens: Number(row.reasoningTokens ?? 0),
          requests: Number(row.requests)
        }))
      });
    }

    // Default: group by virtual key
    const rows = await db
      .select({
        cachedTokens: sum(requestLogs.cachedTokens),
        inputTokens: sum(requestLogs.inputTokens),
        label: virtualKeys.name,
        outputTokens: sum(requestLogs.outputTokens),
        reasoningTokens: sum(requestLogs.reasoningTokens),
        requests: count()
      })
      .from(requestLogs)
      .leftJoin(virtualKeys, eq(requestLogs.virtualKeyId, virtualKeys.id))
      .where(where)
      .groupBy(virtualKeys.name)
      .orderBy(sql`${sum(requestLogs.inputTokens)} DESC`);

    return c.json({
      data: rows.map((row) => ({
        cachedTokens: Number(row.cachedTokens ?? 0),
        inputTokens: Number(row.inputTokens ?? 0),
        label: row.label ?? "Unknown",
        outputTokens: Number(row.outputTokens ?? 0),
        reasoningTokens: Number(row.reasoningTokens ?? 0),
        requests: Number(row.requests)
      }))
    });
  };
