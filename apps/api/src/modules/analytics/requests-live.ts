import type { Database } from '@raven/db'
import { requestLogs } from '@raven/db'
import { and, desc, eq, gt } from 'drizzle-orm'
import type { Context } from 'hono'
import { streamSSE } from 'hono/streaming'

export const getRequestsLive = (db: Database) => async (c: Context) => {
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
}
