import type { Database } from '@raven/db'
import { auditLogs } from '@raven/db'

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
  await db.insert(auditLogs).values({
    organizationId: params.orgId,
    actorId: params.actorId,
    action: params.action,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    metadata: params.metadata ?? null,
  })
}
