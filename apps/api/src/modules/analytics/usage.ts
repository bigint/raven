import type { Database } from "@raven/db";
import { providerConfigs, requestLogs } from "@raven/db";
import { and, avg, count, eq, isNull, sum } from "drizzle-orm";
import type { Redis } from "ioredis";
import type { z } from "zod";
import { cachedQuery } from "@/lib/cache-utils";
import type { AuthContextWithQuery } from "@/lib/types";

import { parseDateRange } from "./helpers";
import type { dateRangeQuerySchema } from "./schema";

const USAGE_TTL = 30;

type Query = z.infer<typeof dateRangeQuerySchema>;

export const getUsage =
  (db: Database, redis?: Redis) => async (c: AuthContextWithQuery<Query>) => {
    const { from, to } = c.req.valid("query");

    const dateConditions = parseDateRange(from, to);
    const where = and(isNull(requestLogs.deletedAt), ...dateConditions);

    const queryFn = async () => {
      const rows = await db
        .select({
          avgLatencyMs: avg(requestLogs.latencyMs),
          model: requestLogs.model,
          provider: requestLogs.provider,
          providerConfigName: providerConfigs.name,
          totalCachedTokens: sum(requestLogs.cachedTokens),
          totalCost: sum(requestLogs.cost),
          totalInputTokens: sum(requestLogs.inputTokens),
          totalOutputTokens: sum(requestLogs.outputTokens),
          totalReasoningTokens: sum(requestLogs.reasoningTokens),
          totalRequests: count()
        })
        .from(requestLogs)
        .leftJoin(
          providerConfigs,
          eq(requestLogs.providerConfigId, providerConfigs.id)
        )
        .where(where)
        .groupBy(requestLogs.provider, requestLogs.model, providerConfigs.name)
        .orderBy(requestLogs.provider, requestLogs.model);

      return rows;
    };

    const cacheKey = `analytics:usage:${from ?? ""}:${to ?? ""}`;
    const data = redis
      ? await cachedQuery(redis, cacheKey, USAGE_TTL, queryFn)
      : await queryFn();

    return c.json({ data });
  };
