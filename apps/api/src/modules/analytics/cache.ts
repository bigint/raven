import type { Database } from "@raven/db";
import { requestLogs } from "@raven/db";
import { and, count, eq, isNull, sql } from "drizzle-orm";
import type { z } from "zod";
import type { AppContextWithQuery } from "@/lib/types";

import { parseDateRange } from "./helpers";
import type { dateRangeQuerySchema } from "./schema";

type Query = z.infer<typeof dateRangeQuerySchema>;

export const getCache =
  (db: Database) => async (c: AppContextWithQuery<Query>) => {
    const orgId = c.get("orgId");
    const { from, to } = c.req.valid("query");

    const dateConditions = parseDateRange(from, to);
    const where = and(
      eq(requestLogs.organizationId, orgId),
      isNull(requestLogs.deletedAt),
      ...dateConditions
    );

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

    return c.json({
      cacheHits,
      cacheMisses,
      daily,
      hitRate,
      totalRequests
    });
  };
