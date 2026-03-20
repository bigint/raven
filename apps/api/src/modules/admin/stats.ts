import type { Database } from "@raven/db";
import { requestLogs, users } from "@raven/db";
import { and, count, gte, isNull, sum } from "drizzle-orm";
import type { Context } from "hono";

export const getAdminStats = (db: Database) => async (c: Context) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [[userCount], [requestStats]] = await Promise.all([
    db.select({ value: count() }).from(users).where(isNull(users.deletedAt)),
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
      .where(
        and(
          gte(requestLogs.createdAt, thirtyDaysAgo),
          isNull(requestLogs.deletedAt)
        )
      )
  ]);

  return c.json({
    data: {
      totalCachedTokens: Number(requestStats?.totalCachedTokens ?? 0),
      totalCost: requestStats?.totalCost ?? "0",
      totalInputTokens: Number(requestStats?.totalInputTokens ?? 0),
      totalOutputTokens: Number(requestStats?.totalOutputTokens ?? 0),
      totalReasoningTokens: Number(requestStats?.totalReasoningTokens ?? 0),
      totalRequests: requestStats?.totalRequests ?? 0,
      totalUsers: userCount?.value ?? 0
    }
  });
};
