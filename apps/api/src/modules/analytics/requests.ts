import type { Database } from "@raven/db";
import { providerConfigs, requestLogs } from "@raven/db";
import { and, count, eq, sql } from "drizzle-orm";
import type { z } from "zod";
import type { AppContextWithQuery } from "@/lib/types";

import { parseDateRange } from "./helpers";
import type { requestsQuerySchema } from "./schema";

type Query = z.infer<typeof requestsQuerySchema>;

export const getRequests =
  (db: Database) => async (c: AppContextWithQuery<Query>) => {
    const orgId = c.get("orgId");
    const query = c.req.valid("query");

    const { limit, page } = query;
    const offset = (page - 1) * limit;

    const dateConditions = parseDateRange(query.from, query.to);

    const filterConditions = [
      eq(requestLogs.organizationId, orgId),
      ...dateConditions
    ];

    if (query.provider) {
      filterConditions.push(eq(requestLogs.provider, query.provider));
    }

    if (query.model) {
      filterConditions.push(eq(requestLogs.model, query.model));
    }

    if (query.statusCode) {
      filterConditions.push(eq(requestLogs.statusCode, query.statusCode));
    }

    if (query.virtualKeyId) {
      filterConditions.push(eq(requestLogs.virtualKeyId, query.virtualKeyId));
    }

    const where = and(...filterConditions);

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
          organizationId: requestLogs.organizationId,
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
      pagination: {
        limit,
        page,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit)
      }
    });
  };
