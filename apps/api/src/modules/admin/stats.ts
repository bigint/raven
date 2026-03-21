import type { Database } from "@raven/db";
import { requestLogs, users } from "@raven/db";
import { and, count, gte, sum } from "drizzle-orm";
import type { Context } from "hono";
import { success } from "@/lib/response";

export const getAdminStats = (db: Database) => async (c: Context) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [[userCount], [requestStats]] = await Promise.all([
    db.select({ value: count() }).from(users),
    db
      .select({
        totalCachedTokens: sum(requestLogs.cachedTokens),
        totalCost: sum(requestLogs.cost),
        totalInputTokens: sum(requestLogs.inputTokens),
        totalOutputTokens: sum(requestLogs.outputTokens),
        totalReasoningTokens: sum(requestLogs.reasoningTokens),
        totalRequests: count()
      })
      .from(requestLogs)
      .where(gte(requestLogs.createdAt, thirtyDaysAgo))
  ]);

  return success(c, {
    totalCachedTokens: Number(requestStats?.totalCachedTokens ?? 0),
    totalCost: requestStats?.totalCost ?? "0",
    totalInputTokens: Number(requestStats?.totalInputTokens ?? 0),
    totalOutputTokens: Number(requestStats?.totalOutputTokens ?? 0),
    totalReasoningTokens: Number(requestStats?.totalReasoningTokens ?? 0),
    totalRequests: requestStats?.totalRequests ?? 0,
    totalUsers: userCount?.value ?? 0
  });
};
