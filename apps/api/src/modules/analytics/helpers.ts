import { requestLogs } from "@raven/db";
import { gte, lte } from "drizzle-orm";

import { ValidationError } from "@/lib/errors";

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
