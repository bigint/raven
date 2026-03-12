import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import type { Database } from '@raven/db'
import { subscriptions } from '@raven/db'
import { PLAN_FEATURES } from '@raven/types'
import { NotFoundError } from '../../lib/errors.js'

export const createBillingModule = (db: Database) => {
  const app = new Hono()

  // GET /subscription — Get current org subscription details
  app.get('/subscription', async (c) => {
    const orgId = c.get('orgId' as never) as string

    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, orgId))
      .limit(1)

    if (!subscription) {
      throw new NotFoundError('No subscription found for this organization')
    }

    return c.json({
      ...subscription,
      features: PLAN_FEATURES[subscription.plan],
    })
  })

  // GET /plans — Return available plans with features
  app.get('/plans', async (c) => {
    const plans = Object.entries(PLAN_FEATURES).map(([plan, features]) => ({
      id: plan,
      features,
    }))

    return c.json(plans)
  })

  return app
}

export const createBillingWebhookModule = (db: Database) => {
  const app = new Hono()

  // POST /webhooks/billing — Paddle webhook handler (no auth required)
  app.post('/', async (c) => {
    const signature = c.req.header('Paddle-Signature')

    if (!signature) {
      return c.json({ code: 'VALIDATION_ERROR', message: 'Missing Paddle-Signature header' }, 400)
    }

    // TODO: Validate Paddle webhook signature using HMAC-SHA256
    // const isValid = validatePaddleSignature(rawBody, signature, env.PADDLE_WEBHOOK_SECRET)
    // if (!isValid) {
    //   return c.json({ code: 'UNAUTHORIZED', message: 'Invalid webhook signature' }, 401)
    // }

    const body = await c.req.json()
    const eventType: string = body?.event_type ?? ''

    switch (eventType) {
      case 'subscription.created': {
        // TODO: Create subscription record
        // const data = body.data
        // await db.insert(subscriptions).values({ ... })
        console.log('Paddle event: subscription.created', body.data?.id)
        break
      }

      case 'subscription.updated': {
        // TODO: Update subscription plan/status/seats
        // await db.update(subscriptions).set({ ... }).where(...)
        console.log('Paddle event: subscription.updated', body.data?.id)
        break
      }

      case 'subscription.cancelled': {
        // TODO: Mark subscription as cancelled
        // await db.update(subscriptions).set({ status: 'cancelled' }).where(...)
        console.log('Paddle event: subscription.cancelled', body.data?.id)
        break
      }

      case 'subscription.past_due': {
        // TODO: Mark subscription as past_due
        console.log('Paddle event: subscription.past_due', body.data?.id)
        break
      }

      default: {
        console.log('Paddle event (unhandled):', eventType)
        break
      }
    }

    return c.json({ received: true })
  })

  return app
}
