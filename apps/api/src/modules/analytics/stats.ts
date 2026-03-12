import type { Database } from "@raven/db";
import { requestLogs } from "@raven/db";
import { and, avg, count, eq, sql, sum } from "drizzle-orm";
import type { Context } from "hono";

import { parseDateRange } from "./helpers.js";

export const getStats = (db: Database) => async (c: Context) => {
  const orgId = c.get("orgId" as never) as string;
  const { from, to } = c.req.query();

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
    avgLatencyMs: row?.avgLatencyMs
      ? Number(row.avgLatencyMs).toFixed(2)
      : "0.00",
    cacheHitRate:
      totalRequests > 0 ? (cacheHits / totalRequests).toFixed(4) : "0.0000",
    totalCost: row?.totalCost ?? "0",
    totalRequests
  });
};
