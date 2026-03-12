import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { parseEnv } from '@raven/config'
import { createDatabase } from '@raven/db'
import { getRedis } from './lib/redis.js'
import { AppError } from './lib/errors.js'

const env = parseEnv()
export const db = createDatabase(env.DATABASE_URL)
export const redis = getRedis(env.REDIS_URL)

const app = new Hono()

// Global middleware
app.use('*', logger())
app.use('*', cors({
  origin: env.APP_URL,
  credentials: true,
}))

// Global error handler
app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json({
      code: err.code,
      message: err.message,
      details: err.details,
    }, err.statusCode as 400)
  }
  console.error('Unhandled error:', err)
  return c.json({ code: 'INTERNAL_ERROR', message: 'Internal server error' }, 500)
})

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }))

serve({ fetch: app.fetch, port: env.API_PORT }, (info) => {
  console.log(`Raven API running on http://localhost:${info.port}`)
})

export default app
