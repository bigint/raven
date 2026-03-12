import { serve } from '@hono/node-server'
import { createAuth } from '@raven/auth'
import { parseEnv } from '@raven/config'
import { createDatabase } from '@raven/db'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { AppError } from './lib/errors.js'
import { initEventBus } from './lib/events.js'
import { getRedis } from './lib/redis.js'
import { createAuthMiddleware } from './middleware/auth.js'
import { createTenantMiddleware } from './middleware/tenant.js'
import { createAnalyticsModule } from './modules/analytics/index.js'
import { createAuditLogsModule } from './modules/audit-logs/index.js'
import { createAuthModule } from './modules/auth/index.js'
import { createBillingModule, createBillingWebhookModule } from './modules/billing/index.js'
import { createBudgetsModule } from './modules/budgets/index.js'
import { createEventsModule } from './modules/events/index.js'
import { createGuardrailsModule } from './modules/guardrails/index.js'
import { createKeysModule } from './modules/keys/index.js'
import { createProvidersModule } from './modules/providers/index.js'
import { createProxyModule } from './modules/proxy/index.js'
import { createSettingsModule } from './modules/settings/index.js'
import { createTeamsModule } from './modules/teams/index.js'
import { createUserModule } from './modules/user/index.js'

const env = parseEnv()
export const db = createDatabase(env.DATABASE_URL)
export const redis = getRedis(env.REDIS_URL)
initEventBus(redis)
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

// Auth routes (no auth middleware)
app.route('/api/auth', createAuthModule(auth))

// Proxy routes (virtual key auth, no session auth)
app.route('/v1/proxy', createProxyModule(db, redis, env))

// Billing webhooks (no auth)
app.route('/webhooks/billing', createBillingWebhookModule(db))

// User-level routes (session auth, no tenant)
const userRoutes = new Hono()
userRoutes.use('*', createAuthMiddleware(auth))
userRoutes.route('/', createUserModule(db))
app.route('/v1/user', userRoutes)

// Protected API routes (session auth + tenant)
const v1 = new Hono()
v1.use('*', createAuthMiddleware(auth))
v1.use('*', createTenantMiddleware(db))
v1.route('/providers', createProvidersModule(db, env))
v1.route('/keys', createKeysModule(db))
v1.route('/budgets', createBudgetsModule(db))
v1.route('/guardrails', createGuardrailsModule(db))
v1.route('/analytics', createAnalyticsModule(db))
v1.route('/teams', createTeamsModule(db))
v1.route('/settings', createSettingsModule(db))
v1.route('/billing', createBillingModule(db))
v1.route('/audit-logs', createAuditLogsModule(db))
v1.route('/events', createEventsModule(redis))
app.route('/v1', v1)

app.notFound((c) => c.json({ code: 'NOT_FOUND', message: 'Route not found' }, 404))

serve({ fetch: app.fetch, port: env.API_PORT }, (info) => {
  console.log(`Raven API running on http://localhost:${info.port}`)
})

export { auth }
export default app
