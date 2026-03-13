import type { Database } from "@raven/db";
import {
  customDomains,
  organizations,
  requestLogs,
  subscriptions,
  users
} from "@raven/db";
import { count, gte, sum } from "drizzle-orm";
import type { Context } from "hono";

export const getAdminStats = (db: Database) => async (c: Context) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [[userCount], [orgCount], planCounts, [requestStats], [domainCount]] =
    await Promise.all([
      db.select({ value: count() }).from(users),
      db.select({ value: count() }).from(organizations),
      db
        .select({
          plan: subscriptions.plan,
          value: count()
        })
        .from(subscriptions)
        .groupBy(subscriptions.plan),
      db
        .select({
          totalCost: sum(requestLogs.cost),
          totalRequests: count()
        })
        .from(requestLogs)
        .where(gte(requestLogs.createdAt, thirtyDaysAgo)),
      db.select({ value: count() }).from(customDomains)
    ]);

  const subscribedCount = planCounts.reduce((acc, p) => acc + p.value, 0);
  const freeOrgCount = (orgCount?.value ?? 0) - subscribedCount;

  const planDistribution = Object.fromEntries(
    planCounts.map((p) => [p.plan, p.value])
  );
  if (freeOrgCount > 0) {
    planDistribution.free = (planDistribution.free ?? 0) + freeOrgCount;
  }

  return c.json({
    data: {
      planDistribution,
      totalCost: requestStats?.totalCost ?? "0",
      totalDomains: domainCount?.value ?? 0,
      totalOrgs: orgCount?.value ?? 0,
      totalRequests: requestStats?.totalRequests ?? 0,
      totalUsers: userCount?.value ?? 0
    }
  });
};
