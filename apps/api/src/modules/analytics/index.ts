import type { Database } from '@raven/db'
import { Hono } from 'hono'

import { getRequestsLive } from './requests-live.js'
import { getRequests } from './requests.js'
import { getStats } from './stats.js'
import { getUsage } from './usage.js'

export const createAnalyticsModule = (db: Database) => {
  const app = new Hono()

  app.get('/stats', getStats(db))
  app.get('/usage', getUsage(db))
  app.get('/requests/live', getRequestsLive(db))
  app.get('/requests', getRequests(db))

  return app
}
