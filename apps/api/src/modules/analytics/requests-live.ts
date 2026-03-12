import type { Database } from '@raven/db'
import { requestLogs } from '@raven/db'
import { desc, eq } from 'drizzle-orm'
import type { Context } from 'hono'
import { streamSSE } from 'hono/streaming'
import { getEventRedis } from '../../lib/events.js'

export const getRequestsLive = (db: Database) => async (c: Context) => {
  const orgId = c.get('orgId' as never) as string

  return streamSSE(c, async (stream) => {
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

    if (initial.length > 0) {
      await stream.writeSSE({
        event: 'init',
        data: JSON.stringify(initial),
      })
    }

    // Subscribe to realtime events via Redis pub/sub
    const redis = getEventRedis()
    if (!redis) {
      // Fallback: just keep connection alive without realtime
      while (!aborted) {
        await stream.sleep(15000)
      }
      return
    }

    const sub = redis.duplicate()
    const channel = `org:${orgId}:events`

    await sub.subscribe(channel)

    sub.on('message', async (_ch: string, message: string) => {
      if (aborted) return
      try {
        const event = JSON.parse(message)
        if (event.type === 'request.created') {
          await stream.writeSSE({
            event: 'new',
            data: JSON.stringify([event.data]),
          })
        }
      } catch {
        // ignore parse errors
      }
    })

    // Keep alive with heartbeat
    while (!aborted) {
      await stream.sleep(15000)
      if (aborted) break
      await stream.writeSSE({
        event: 'heartbeat',
        data: '',
      })
    }

    await sub.unsubscribe(channel)
    sub.disconnect()
  })
}
