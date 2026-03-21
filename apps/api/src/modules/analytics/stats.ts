import type { Database } from "@raven/db";
import { requestLogs } from "@raven/db";
import { and, avg, count, sql, sum } from "drizzle-orm";
import type { Redis } from "ioredis";
import type { z } from "zod";
import { cachedQuery } from "@/lib/cache-utils";
import type { AuthContextWithQuery } from "@/lib/types";

import { parseDateRange } from "./helpers";
import type { dateRangeQuerySchema } from "./schema";

const STATS_TTL = 30;

type Query = z.infer<typeof dateRangeQuerySchema>;

export const getStats =
  (db: Database, redis?: Redis) => async (c: AuthContextWithQuery<Query>) => {
    const { from, to } = c.req.valid("query");

    const dateConditions = parseDateRange(from, to);
    const where = and(...dateConditions);

    const queryFn = async () => {
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

      return {
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
      };
    };

    const cacheKey = `analytics:stats:${from ?? ""}:${to ?? ""}`;
    const data = redis
      ? await cachedQuery(redis, cacheKey, STATS_TTL, queryFn)
      : await queryFn();

    return c.json({ data });
  };
