import type { Database } from "@raven/db";
import { requestLogs } from "@raven/db";
import { and, count, isNull, sql } from "drizzle-orm";
import type { Redis } from "ioredis";
import type { z } from "zod";
import { cachedQuery } from "@/lib/cache-utils";
import type { AuthContextWithQuery } from "@/lib/types";

import { parseDateRange } from "./helpers";
import type { dateRangeQuerySchema } from "./schema";

const CACHE_TTL = 30;

type Query = z.infer<typeof dateRangeQuerySchema>;

export const getCache =
  (db: Database, redis?: Redis) => async (c: AuthContextWithQuery<Query>) => {
    const { from, to } = c.req.valid("query");

    const dateConditions = parseDateRange(from, to);
    const where = and(isNull(requestLogs.deletedAt), ...dateConditions);

    const queryFn = async () => {
      const [summary] = await db
        .select({
          cacheHits: count(sql`CASE WHEN ${requestLogs.cacheHit} THEN 1 END`),
          cacheMisses: count(
            sql`CASE WHEN NOT ${requestLogs.cacheHit} THEN 1 END`
          ),
          totalRequests: count()
        })
        .from(requestLogs)
        .where(where);

      const totalRequests = Number(summary?.totalRequests ?? 0);
      const cacheHits = Number(summary?.cacheHits ?? 0);
      const cacheMisses = Number(summary?.cacheMisses ?? 0);
      const hitRate =
        totalRequests > 0 ? (cacheHits / totalRequests).toFixed(4) : "0.0000";

      const daily = await db
        .select({
          date: sql<string>`DATE(${requestLogs.createdAt})`.as("date"),
          hits: count(sql`CASE WHEN ${requestLogs.cacheHit} THEN 1 END`),
          misses: count(sql`CASE WHEN NOT ${requestLogs.cacheHit} THEN 1 END`),
          total: count()
        })
        .from(requestLogs)
        .where(where)
        .groupBy(sql`DATE(${requestLogs.createdAt})`)
        .orderBy(sql`DATE(${requestLogs.createdAt})`);

      return { cacheHits, cacheMisses, daily, hitRate, totalRequests };
    };

    const cacheKey = `analytics:cache:${from ?? ""}:${to ?? ""}`;
    const data = redis
      ? await cachedQuery(redis, cacheKey, CACHE_TTL, queryFn)
      : await queryFn();

    return c.json(data);
  };
