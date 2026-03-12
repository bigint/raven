import type { Database } from '@raven/db'
import { requestLogs } from '@raven/db'
import { and, avg, count, eq, sum } from 'drizzle-orm'
import type { Context } from 'hono'

import { parseDateRange } from './helpers.js'

export const getUsage = (db: Database) => async (c: Context) => {
  const orgId = c.get('orgId' as never) as string
  const { from, to } = c.req.query()

  const dateConditions = parseDateRange(from, to)
  const where = and(eq(requestLogs.organizationId, orgId), ...dateConditions)

  const rows = await db
    .select({
      provider: requestLogs.provider,
      model: requestLogs.model,
      totalRequests: count(),
      totalCost: sum(requestLogs.cost),
      totalInputTokens: sum(requestLogs.inputTokens),
      totalOutputTokens: sum(requestLogs.outputTokens),
      avgLatencyMs: avg(requestLogs.latencyMs),
    })
    .from(requestLogs)
    .where(where)
    .groupBy(requestLogs.provider, requestLogs.model)
    .orderBy(requestLogs.provider, requestLogs.model)

  return c.json(rows)
}
