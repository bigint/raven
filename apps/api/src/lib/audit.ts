import type { Database } from "@raven/db";

import { publishEvent } from "@/lib/events";
import { logAudit } from "@/modules/audit-logs/log";

export const auditAndPublish = (
  db: Database,
  user: { id: string },
  resourceType: string,
  action: string,
  opts: {
    resourceId: string;
    data?: unknown;
    metadata?: Record<string, unknown>;
  }
): void => {
  const eventName = `${resourceType}.${action}`;
  void publishEvent(eventName, opts.data ?? { id: opts.resourceId });
  void logAudit(db, {
    action: eventName,
    actorId: user.id,
    metadata: opts.metadata,
    resourceId: opts.resourceId,
    resourceType
  });
};
