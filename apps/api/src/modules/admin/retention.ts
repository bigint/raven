import type { Database } from "@raven/db";
import { requestLogs } from "@raven/db";
import { lt } from "drizzle-orm";

const DEFAULT_RETENTION_DAYS = 90;

export const cleanupRetention = async (db: Database) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DEFAULT_RETENTION_DAYS);

  const result = await db
    .delete(requestLogs)
    .where(lt(requestLogs.createdAt, cutoff))
    .returning({ id: requestLogs.id });

  console.log(
    `Retention cleanup: removed ${result.length} log entries older than ${DEFAULT_RETENTION_DAYS} days`
  );

  return { removed: result.length };
};
