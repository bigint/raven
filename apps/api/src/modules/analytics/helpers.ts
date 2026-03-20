import type { Database } from "@raven/db";
import { requestLogs, settings } from "@raven/db";
import { format, startOfDay, subDays } from "date-fns";
import { eq, gte, lte } from "drizzle-orm";

import { ValidationError } from "@/lib/errors";

export const getRetentionDays = async (db: Database): Promise<number> => {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, "analytics_retention_days"));
  return row ? Number.parseInt(row.value, 10) : 365;
};

export const clampAnalyticsRetention = async (
  db: Database,
  from: string | undefined
): Promise<string | null> => {
  const retentionDays = await getRetentionDays(db);
  const earliest = startOfDay(subDays(new Date(), retentionDays));
  const fromDate = from ? new Date(from) : null;

  if (!fromDate || fromDate < earliest) {
    return format(earliest, "yyyy-MM-dd");
  }
  return null;
};

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
