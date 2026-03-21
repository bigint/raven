import type { Database } from "@raven/db";
import { auditLogs, requestLogs, settings } from "@raven/db";
import { subDays } from "date-fns";
import { eq, lt } from "drizzle-orm";

export const cleanupRetention = async (db: Database) => {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, "analytics_retention_days"));

  const retentionDays = row ? Number.parseInt(row.value, 10) : 365;
  const cutoff = subDays(new Date(), retentionDays);

  const deletedRequests = await db
    .delete(requestLogs)
    .where(lt(requestLogs.createdAt, cutoff))
    .returning({ id: requestLogs.id });

  const deletedAudits = await db
    .delete(auditLogs)
    .where(lt(auditLogs.createdAt, cutoff))
    .returning({ id: auditLogs.id });

  console.log(
    `Retention cleanup: deleted ${deletedRequests.length} request logs and ${deletedAudits.length} audit logs older than ${retentionDays} days`
  );
};
