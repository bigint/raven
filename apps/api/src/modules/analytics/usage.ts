import type { Database } from "@raven/db";
import { providerConfigs, requestLogs } from "@raven/db";
import { and, avg, count, eq, isNull, sum } from "drizzle-orm";
import type { z } from "zod";
import type { AppContextWithQuery } from "@/lib/types";

import { parseDateRange } from "./helpers";
import type { dateRangeQuerySchema } from "./schema";

type Query = z.infer<typeof dateRangeQuerySchema>;

export const getUsage =
  (db: Database) => async (c: AppContextWithQuery<Query>) => {
    const orgId = c.get("orgId");
    const { from, to } = c.req.valid("query");

    const dateConditions = parseDateRange(from, to);
    const where = and(eq(requestLogs.organizationId, orgId), ...dateConditions);

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

    return c.json({ data: rows });
  };
