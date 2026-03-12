import type { Database } from '@raven/db'
import { requestLogs } from '@raven/db'
import { and, avg, count, desc, eq, gt, gte, lte, sql, sum } from 'drizzle-orm'
import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { ValidationError } from '../../lib/errors.js'

const parseDateRange = (from?: string, to?: string) => {
  const conditions: ReturnType<typeof gte>[] = []

  if (from) {
    const fromDate = new Date(from)
    if (Number.isNaN(fromDate.getTime())) {
      throw new ValidationError('Invalid `from` date')
    }
    conditions.push(gte(requestLogs.createdAt, fromDate))
  }

  if (to) {
    const toDate = new Date(to)
    if (Number.isNaN(toDate.getTime())) {
      throw new ValidationError('Invalid `to` date')
    }
    conditions.push(lte(requestLogs.createdAt, toDate))
  }

  return conditions
}

export const createAnalyticsModule = (db: Database) => {
  const app = new Hono()

  // GET /stats — Aggregate stats for the org
  app.get('/stats', async (c) => {
    const orgId = c.get('orgId' as never) as string
    const { from, to } = c.req.query()

    const dateConditions = parseDateRange(from, to)
    const where = and(eq(requestLogs.organizationId, orgId), ...dateConditions)

    const [row] = await db
      .select({
        totalRequests: count(),
        totalCost: sum(requestLogs.cost),
        avgLatencyMs: avg(requestLogs.latencyMs),
        cacheHits: sum(sql<number>`CASE WHEN ${requestLogs.cacheHit} THEN 1 ELSE 0 END`),
      })
      .from(requestLogs)
      .where(where)

    const totalRequests = Number(row?.totalRequests ?? 0)
    const cacheHits = Number(row?.cacheHits ?? 0)

    return c.json({
      totalRequests,
      totalCost: row?.totalCost ?? '0',
      avgLatencyMs: row?.avgLatencyMs ? Number(row.avgLatencyMs).toFixed(2) : '0.00',
      cacheHitRate: totalRequests > 0 ? (cacheHits / totalRequests).toFixed(4) : '0.0000',
    })
  })

  // GET /usage — Usage breakdown by provider and model
  app.get('/usage', async (c) => {
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
  })

  // GET /requests/live — SSE stream of new request logs
  app.get('/requests/live', async (c) => {
    const orgId = c.get('orgId' as never) as string

    return streamSSE(c, async (stream) => {
      let lastId: string | null = null
      let aborted = false

      c.req.raw.signal.addEventListener('abort', () => {
        aborted = true
      })

      // Send initial batch of recent logs
      const initial = await db
        .select()
        .from(requestLogs)
        .where(eq(requestLogs.organizationId, orgId))
        .orderBy(desc(requestLogs.createdAt))
        .limit(50)

      const firstInitial = initial[0]
      if (firstInitial) {
        lastId = firstInitial.id
        await stream.writeSSE({
          event: 'init',
          data: JSON.stringify(initial),
        })
      }

      // Poll for new logs every 2 seconds
      while (!aborted) {
        await stream.sleep(2000)
        if (aborted) break

        const conditions = [eq(requestLogs.organizationId, orgId)]
        if (lastId) {
          const [lastLog] = await db
            .select({ createdAt: requestLogs.createdAt })
            .from(requestLogs)
            .where(eq(requestLogs.id, lastId))
            .limit(1)

          if (lastLog) {
            conditions.push(gt(requestLogs.createdAt, lastLog.createdAt))
          }
        }

        const newRows = await db
          .select()
          .from(requestLogs)
          .where(and(...conditions))
          .orderBy(desc(requestLogs.createdAt))
          .limit(50)

        const firstNew = newRows[0]
        if (firstNew) {
          lastId = firstNew.id
          await stream.writeSSE({
            event: 'new',
            data: JSON.stringify(newRows),
          })
        }
      }
    })
  })

  // GET /requests — Paginated request logs with filters
  app.get('/requests', async (c) => {
    const orgId = c.get('orgId' as never) as string
    const query = c.req.query()

    const page = Math.max(1, Number(query.page ?? 1))
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)))
    const offset = (page - 1) * limit

    const dateConditions = parseDateRange(query.from, query.to)

    const filterConditions = [eq(requestLogs.organizationId, orgId), ...dateConditions]

    if (query.provider) {
      filterConditions.push(eq(requestLogs.provider, query.provider))
    }

    if (query.model) {
      filterConditions.push(eq(requestLogs.model, query.model))
    }

    if (query.statusCode) {
      const code = Number(query.statusCode)
      if (!Number.isNaN(code)) {
        filterConditions.push(eq(requestLogs.statusCode, code))
      }
    }

    if (query.virtualKeyId) {
      filterConditions.push(eq(requestLogs.virtualKeyId, query.virtualKeyId))
    }

    const where = and(...filterConditions)

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(requestLogs)
        .where(where)
        .orderBy(sql`${requestLogs.createdAt} DESC`)
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(requestLogs).where(where),
    ])

    const total = countResult[0]?.total ?? 0

    return c.json({
      data: rows,
      pagination: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
    })
  })

  return app
}
