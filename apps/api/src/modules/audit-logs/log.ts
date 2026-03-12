import type { Database } from '@raven/db'
import { auditLogs } from '@raven/db'
import { publishEvent } from '../../lib/events.js'

export const logAudit = async (
  db: Database,
  params: {
    orgId: string
    actorId: string
    action: string
    resourceType: string
    resourceId: string
    metadata?: Record<string, unknown>
  },
): Promise<void> => {
  const entry = {
    organizationId: params.orgId,
    actorId: params.actorId,
    action: params.action,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    metadata: params.metadata ?? null,
  }
  await db.insert(auditLogs).values(entry)
  void publishEvent(params.orgId, 'audit.created', entry)
}
