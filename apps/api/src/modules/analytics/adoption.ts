import type { Database } from "@raven/db";
import { requestLogs, virtualKeys } from "@raven/db";
import { and, count, eq, isNull, sql, sum } from "drizzle-orm";
import type { Redis } from "ioredis";
import type { z } from "zod";
import { cachedQuery } from "@/lib/cache-utils";
import type { AppContextWithQuery } from "@/lib/types";

import { parseDateRange } from "./helpers";
import type { adoptionQuerySchema, dateRangeQuerySchema } from "./schema";

const ADOPTION_CHART_TTL = 60;
const ADOPTION_BREAKDOWN_TTL = 60;

type DateQuery = z.infer<typeof dateRangeQuerySchema>;
type AdoptionQuery = z.infer<typeof adoptionQuerySchema>;

/** Daily token breakdown for stacked chart */
export const getAdoptionChart =
  (db: Database, redis?: Redis) =>
  async (c: AppContextWithQuery<DateQuery>) => {
    const orgId = c.get("orgId");
    const { from, to } = c.req.valid("query");

    const dateConditions = parseDateRange(from, to);
    const where = and(
      eq(requestLogs.organizationId, orgId),
      isNull(requestLogs.deletedAt),
      ...dateConditions
    );

    const queryFn = async () => {
      const rows = await db
        .select({
          cached: sum(requestLogs.cachedTokens).as("cached"),
          date: sql<string>`DATE(${requestLogs.createdAt})`.as("date"),
          input: sum(requestLogs.inputTokens).as("input"),
          output: sum(requestLogs.outputTokens).as("output"),
          reasoning: sum(requestLogs.reasoningTokens).as("reasoning")
        })
        .from(requestLogs)
        .where(where)
        .groupBy(sql`DATE(${requestLogs.createdAt})`)
        .orderBy(sql`DATE(${requestLogs.createdAt})`);

      return rows.map((row) => ({
        cached: Number(row.cached ?? 0),
        date: row.date,
        input: Number(row.input ?? 0),
        output: Number(row.output ?? 0),
        reasoning: Number(row.reasoning ?? 0)
      }));
    };

    const cacheKey = `analytics:adoption-chart:${orgId}:${from ?? ""}:${to ?? ""}`;
    const data = redis
      ? await cachedQuery(redis, cacheKey, ADOPTION_CHART_TTL, queryFn)
      : await queryFn();

    return c.json({ data });
  };

/** Per-key or per-model usage breakdown */
export const getAdoptionBreakdown =
  (db: Database, redis?: Redis) =>
  async (c: AppContextWithQuery<AdoptionQuery>) => {
    const orgId = c.get("orgId");
    const { from, to, groupBy } = c.req.valid("query");

    const dateConditions = parseDateRange(from, to);
    const where = and(
      eq(requestLogs.organizationId, orgId),
      isNull(requestLogs.deletedAt),
      ...dateConditions
    );

    const mapBreakdownRows = (
      rows: {
        cachedTokens: string | null;
        inputTokens: string | null;
        label: string | null;
        outputTokens: string | null;
        reasoningTokens: string | null;
        requests: number;
      }[],
      defaultLabel = "Unknown"
    ) =>
      rows.map((row) => ({
        cachedTokens: Number(row.cachedTokens ?? 0),
        inputTokens: Number(row.inputTokens ?? 0),
        label: row.label ?? defaultLabel,
        outputTokens: Number(row.outputTokens ?? 0),
        reasoningTokens: Number(row.reasoningTokens ?? 0),
        requests: Number(row.requests)
      }));

    const queryFn = async () => {
      if (groupBy === "userAgent") {
        const rows = await db
          .select({
            cachedTokens: sum(requestLogs.cachedTokens),
            inputTokens: sum(requestLogs.inputTokens),
            label: requestLogs.userAgent,
            outputTokens: sum(requestLogs.outputTokens),
            reasoningTokens: sum(requestLogs.reasoningTokens),
            requests: count()
          })
          .from(requestLogs)
          .where(where)
          .groupBy(requestLogs.userAgent)
          .orderBy(sql`${sum(requestLogs.inputTokens)} DESC`);

        return mapBreakdownRows(rows);
      }

      if (groupBy === "model") {
        const rows = await db
          .select({
            cachedTokens: sum(requestLogs.cachedTokens),
            inputTokens: sum(requestLogs.inputTokens),
            label: requestLogs.model,
            outputTokens: sum(requestLogs.outputTokens),
            reasoningTokens: sum(requestLogs.reasoningTokens),
            requests: count()
          })
          .from(requestLogs)
          .where(where)
          .groupBy(requestLogs.model)
          .orderBy(sql`${sum(requestLogs.inputTokens)} DESC`);

        return mapBreakdownRows(rows);
      }

      // Default: group by virtual key
      const rows = await db
        .select({
          cachedTokens: sum(requestLogs.cachedTokens),
          inputTokens: sum(requestLogs.inputTokens),
          label: virtualKeys.name,
          outputTokens: sum(requestLogs.outputTokens),
          reasoningTokens: sum(requestLogs.reasoningTokens),
          requests: count()
        })
        .from(requestLogs)
        .leftJoin(virtualKeys, eq(requestLogs.virtualKeyId, virtualKeys.id))
        .where(where)
        .groupBy(virtualKeys.name)
        .orderBy(sql`${sum(requestLogs.inputTokens)} DESC`);

      return mapBreakdownRows(rows);
    };

    const cacheKey = `analytics:adoption-breakdown:${orgId}:${groupBy ?? "key"}:${from ?? ""}:${to ?? ""}`;
    const data = redis
      ? await cachedQuery(redis, cacheKey, ADOPTION_BREAKDOWN_TTL, queryFn)
      : await queryFn();

    return c.json({ data });
  };
