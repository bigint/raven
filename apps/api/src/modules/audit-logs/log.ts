import type { Database } from "@raven/db";
import { auditLogs } from "@raven/db";
import { publishEvent } from "@/lib/events";

export const logAudit = async (
  db: Database,
  params: {
    actorId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> => {
  const entry = {
    action: params.action,
    actorId: params.actorId,
    metadata: params.metadata ?? null,
    resourceId: params.resourceId,
    resourceType: params.resourceType
  };
  await db.insert(auditLogs).values(entry);
  void publishEvent("audit.created", entry);
};
