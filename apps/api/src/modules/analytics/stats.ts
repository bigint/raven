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
        totalCost: sum(requestLogs.cost),
        totalRequests: count()
      })
      .from(requestLogs)
      .where(where);

    const totalRequests = Number(row?.totalRequests ?? 0);
    const cacheHits = Number(row?.cacheHits ?? 0);

    return c.json({
      data: {
        avgLatencyMs: row?.avgLatencyMs
          ? Number(row.avgLatencyMs).toFixed(2)
          : "0.00",
        cacheHitRate:
          totalRequests > 0 ? (cacheHits / totalRequests).toFixed(4) : "0.0000",
        totalCost: row?.totalCost ?? "0",
        totalRequests
      }
    });
  };
