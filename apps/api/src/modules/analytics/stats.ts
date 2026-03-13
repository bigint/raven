import type { Database } from "@raven/db";
import { requestLogs } from "@raven/db";
import { and, avg, count, eq, sql, sum } from "drizzle-orm";
import type { z } from "zod";
import type { AppContextWithQuery } from "@/lib/types";

import { parseDateRange } from "./helpers";
import type { dateRangeQuerySchema } from "./schema";

type Query = z.infer<typeof dateRangeQuerySchema>;

export const getStats =
  (db: Database) => async (c: AppContextWithQuery<Query>) => {
    const orgId = c.get("orgId");
    const { from, to } = c.req.valid("query");

    const dateConditions = parseDateRange(from, to);
    const where = and(eq(requestLogs.organizationId, orgId), ...dateConditions);

    const [row] = await db
      .select({
        avgLatencyMs: avg(requestLogs.latencyMs),
        cacheHits: sum(
          sql<number>`CASE WHEN ${requestLogs.cacheHit} THEN 1 ELSE 0 END`
        ),
        totalCachedTokens: sum(requestLogs.cachedTokens),
        totalCost: sum(requestLogs.cost),
        totalInputTokens: sum(requestLogs.inputTokens),
        totalOutputTokens: sum(requestLogs.outputTokens),
        totalReasoningTokens: sum(requestLogs.reasoningTokens),
        totalRequests: count()
      })
      .from(requestLogs)
      .where(where);

    const totalRequests = Number(row?.totalRequests ?? 0);
    const cacheHits = Number(row?.cacheHits ?? 0);
    const totalInputTokens = Number(row?.totalInputTokens ?? 0);
    const totalOutputTokens = Number(row?.totalOutputTokens ?? 0);
    const totalCachedTokens = Number(row?.totalCachedTokens ?? 0);
    const totalReasoningTokens = Number(row?.totalReasoningTokens ?? 0);

    return c.json({
      data: {
        avgLatencyMs: row?.avgLatencyMs
          ? Number(row.avgLatencyMs).toFixed(2)
          : "0.00",
        cacheHitRate:
          totalRequests > 0 ? (cacheHits / totalRequests).toFixed(4) : "0.0000",
        totalCachedTokens,
        totalCost: row?.totalCost ?? "0",
        totalInputTokens,
        totalOutputTokens,
        totalReasoningTokens,
        totalRequests,
        totalTokens:
          totalInputTokens +
          totalOutputTokens +
          totalCachedTokens +
          totalReasoningTokens
      }
    });
  };
