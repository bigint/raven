import { serve } from '@hono/node-server'
import { createAuth } from '@raven/auth'
import { parseEnv } from '@raven/config'
import { createDatabase } from '@raven/db'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { AppError } from './lib/errors.js'
import { getRedis } from './lib/redis.js'
import { createAuthModule } from './modules/auth/index.js'

const env = parseEnv()
export const db = createDatabase(env.DATABASE_URL)
export const redis = getRedis(env.REDIS_URL)
const auth = createAuth(db, env)

const app = new Hono()

// Global middleware
app.use('*', logger())
app.use(
  '*',
  cors({
    origin: [env.APP_URL],
    credentials: true,
  }),
)

// Global error handler
app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json(
      {
        code: err.code,
        message: err.message,
        details: err.details,
      },
      err.statusCode as 400 | 401 | 403 | 404 | 409 | 429 | 500,
    )
  }
  console.error('Unhandled error:', err)
  return c.json({ code: 'INTERNAL_ERROR', message: 'Internal server error' }, 500)
})

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }))

app.route('/auth', createAuthModule(auth))

app.notFound((c) => c.json({ code: 'NOT_FOUND', message: 'Route not found' }, 404))

serve({ fetch: app.fetch, port: env.API_PORT }, (info) => {
  console.log(`Raven API running on http://localhost:${info.port}`)
})

export { auth }
export default app
