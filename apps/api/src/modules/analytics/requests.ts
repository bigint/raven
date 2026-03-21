import type { Database } from "@raven/db";
import { providerConfigs, requestLogs } from "@raven/db";
import { and, count, eq, sql } from "drizzle-orm";
import type { z } from "zod";
import { buildPaginationMeta, getOffset } from "@/lib/pagination";
import type { AuthContextWithQuery } from "@/lib/types";

import { parseDateRange } from "./helpers";
import type { requestsQuerySchema } from "./schema";

type Query = z.infer<typeof requestsQuerySchema>;

export const getRequests =
  (db: Database) => async (c: AuthContextWithQuery<Query>) => {
    const query = c.req.valid("query");

    const { limit, page } = query;
    const offset = getOffset(page, limit);

    const dateConditions = parseDateRange(query.from, query.to);

    const where = and(
      ...dateConditions,
      ...(query.endUser ? [eq(requestLogs.endUser, query.endUser)] : []),
      ...(query.provider ? [eq(requestLogs.provider, query.provider)] : []),
      ...(query.model ? [eq(requestLogs.model, query.model)] : []),
      ...(query.statusCode
        ? [eq(requestLogs.statusCode, query.statusCode)]
        : []),
      ...(query.virtualKeyId
        ? [eq(requestLogs.virtualKeyId, query.virtualKeyId)]
        : [])
    );

    const [rows, countResult] = await Promise.all([
      db
        .select({
          cachedTokens: requestLogs.cachedTokens,
          cacheHit: requestLogs.cacheHit,
          cost: requestLogs.cost,
          createdAt: requestLogs.createdAt,
          id: requestLogs.id,
          inputTokens: requestLogs.inputTokens,
          latencyMs: requestLogs.latencyMs,
          method: requestLogs.method,
          model: requestLogs.model,
          outputTokens: requestLogs.outputTokens,
          path: requestLogs.path,
          provider: requestLogs.provider,
          providerConfigName: providerConfigs.name,
          statusCode: requestLogs.statusCode,
          virtualKeyId: requestLogs.virtualKeyId
        })
        .from(requestLogs)
        .leftJoin(
          providerConfigs,
          eq(requestLogs.providerConfigId, providerConfigs.id)
        )
        .where(where)
        .orderBy(sql`${requestLogs.createdAt} DESC`)
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(requestLogs).where(where)
    ]);

    const total = countResult[0]?.total ?? 0;

    return c.json({
      data: rows,
      pagination: buildPaginationMeta({ limit, page }, Number(total))
    });
  };
