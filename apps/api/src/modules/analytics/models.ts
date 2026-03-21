import type { Database } from "@raven/db";
import { requestLogs } from "@raven/db";
import { and, avg, count, max, sql, sum } from "drizzle-orm";
import type { Redis } from "ioredis";
import type { z } from "zod";
import { cachedQuery } from "@/lib/cache-utils";
import type { AuthContextWithQuery } from "@/lib/types";

import { parseDateRange } from "./helpers";
import type { dateRangeQuerySchema } from "./schema";

const MODELS_TTL = 60;

type Query = z.infer<typeof dateRangeQuerySchema>;

export const getModels =
  (db: Database, redis?: Redis) => async (c: AuthContextWithQuery<Query>) => {
    const { from, to } = c.req.valid("query");

    const dateConditions = parseDateRange(from, to);
    const where = and(...dateConditions);

    const queryFn = async () => {
      const rows = await db
        .select({
          avgLatencyMs: avg(requestLogs.latencyMs),
          cachedTokens: sum(requestLogs.cachedTokens),
          inputTokens: sum(requestLogs.inputTokens),
          lastUsed: max(requestLogs.createdAt),
          model: requestLogs.model,
          outputTokens: sum(requestLogs.outputTokens),
          provider: requestLogs.provider,
          reasoningTokens: sum(requestLogs.reasoningTokens),
          requests: count(),
          totalCost: sum(requestLogs.cost)
        })
        .from(requestLogs)
        .where(where)
        .groupBy(requestLogs.model, requestLogs.provider)
        .orderBy(sql`${count()} DESC`);

      return rows.map((row) => ({
        avgLatencyMs: Number(row.avgLatencyMs ?? 0),
        cachedTokens: Number(row.cachedTokens ?? 0),
        inputTokens: Number(row.inputTokens ?? 0),
        lastUsed: row.lastUsed,
        model: row.model,
        outputTokens: Number(row.outputTokens ?? 0),
        provider: row.provider,
        reasoningTokens: Number(row.reasoningTokens ?? 0),
        requests: Number(row.requests),
        totalCost: row.totalCost ?? "0"
      }));
    };

    const cacheKey = `analytics:models:${from ?? ""}:${to ?? ""}`;
    const data = redis
      ? await cachedQuery(redis, cacheKey, MODELS_TTL, queryFn)
      : await queryFn();

    return c.json({ data });
  };
