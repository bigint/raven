import type { Database } from "@raven/db";
import { requestLogs } from "@raven/db";
import { PLAN_FEATURES } from "@raven/types";
import { gte, lte } from "drizzle-orm";
import type { Redis } from "ioredis";

import { ValidationError } from "@/lib/errors";
import { getOrgPlan } from "@/modules/proxy/plan-gate";

export const parseDateRange = (
  from?: string,
  to?: string
): ReturnType<typeof gte>[] => {
  const fromCondition = (() => {
    if (!from) return [];
    const fromDate = new Date(from);
    if (Number.isNaN(fromDate.getTime())) {
      throw new ValidationError("Invalid `from` date");
    }
    return [gte(requestLogs.createdAt, fromDate)];
  })();

  const toCondition = (() => {
    if (!to) return [];
    const toDate = new Date(to);
    if (Number.isNaN(toDate.getTime())) {
      throw new ValidationError("Invalid `to` date");
    }
    return [lte(requestLogs.createdAt, toDate)];
  })();

  return [...fromCondition, ...toCondition];
};

export const clampAnalyticsRetention = async (
  db: Database,
  orgId: string,
  from?: string,
  redis?: Redis
): Promise<string | undefined> => {
  const plan = await getOrgPlan(db, orgId, redis);
  const retentionDays = PLAN_FEATURES[plan].analyticsRetentionDays;

  const earliest = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  if (!from) return earliest.toISOString();

  const fromDate = new Date(from);
  if (Number.isNaN(fromDate.getTime())) return earliest.toISOString();

  return fromDate < earliest ? earliest.toISOString() : from;
};
