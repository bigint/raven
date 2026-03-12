import type { Database } from '@raven/db'
import { subscriptions } from '@raven/db'
import { PLAN_FEATURES } from '@raven/types'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'

const PLAN_DETAILS: Record<
  string,
  {
    name: string
    description: string
    priceMonthly: number
    priceYearly: number
    isPopular?: boolean
  }
> = {
  free: {
    name: 'Free',
    description: 'For individuals and small experiments.',
    priceMonthly: 0,
    priceYearly: 0,
  },
  pro: {
    name: 'Pro',
    description: 'For professionals who need more power.',
    priceMonthly: 29,
    priceYearly: 278,
    isPopular: true,
  },
  team: {
    name: 'Team',
    description: 'For growing teams with advanced needs.',
    priceMonthly: 79,
    priceYearly: 758,
  },
  enterprise: {
    name: 'Enterprise',
    description: 'For organizations that need everything.',
    priceMonthly: 299,
    priceYearly: 2870,
  },
}

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
      return c.json(null)
    }

    const details = PLAN_DETAILS[subscription.plan]

    return c.json({
      planId: subscription.plan,
      planName: details?.name ?? subscription.plan,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: false,
    })
  })

  // GET /plans — Return available plans with features
  app.get('/plans', async (c) => {
    const plans = Object.entries(PLAN_FEATURES).map(([plan, features]) => {
      const details = PLAN_DETAILS[plan]
      const featureList = [
        {
          text: `${features.maxRequestsPerMonth === Number.POSITIVE_INFINITY ? 'Unlimited' : features.maxRequestsPerMonth.toLocaleString()} requests/month`,
          included: true,
        },
        {
          text: `${features.maxProviders === Number.POSITIVE_INFINITY ? 'Unlimited' : features.maxProviders} providers`,
          included: true,
        },
        {
          text: `${features.maxVirtualKeys === Number.POSITIVE_INFINITY ? 'Unlimited' : features.maxVirtualKeys} virtual keys`,
          included: true,
        },
        {
          text: `${features.maxBudgets === Number.POSITIVE_INFINITY ? 'Unlimited' : features.maxBudgets} budgets`,
          included: true,
        },
        {
          text: `${features.maxSeats === Number.POSITIVE_INFINITY ? 'Unlimited' : features.maxSeats} seats`,
          included: true,
        },
        { text: `${features.analyticsRetentionDays}-day analytics retention`, included: true },
        { text: 'Team management', included: features.hasTeams },
        { text: 'SSO authentication', included: features.hasSSO },
        { text: 'Audit logs', included: features.hasAuditLogs },
        { text: 'Guardrails', included: features.hasGuardrails },
      ]

      return {
        id: plan,
        name: details?.name ?? plan,
        description: details?.description ?? '',
        priceMonthly: details?.priceMonthly ?? 0,
        priceYearly: details?.priceYearly ?? 0,
        isPopular: details?.isPopular ?? false,
        features: featureList,
      }
    })

    return c.json(plans)
  })

  return app
}

export const createBillingWebhookModule = (_db: Database) => {
  const app = new Hono()

  // POST /webhooks/billing — Paddle webhook handler (no auth required)
  app.post('/', async (c) => {
    const signature = c.req.header('Paddle-Signature')

    if (!signature) {
      return c.json({ code: 'VALIDATION_ERROR', message: 'Missing Paddle-Signature header' }, 400)
    }

    const body = await c.req.json()
    const eventType: string = body?.event_type ?? ''

    switch (eventType) {
      case 'subscription.created': {
        console.log('Paddle event: subscription.created', body.data?.id)
        break
      }

      case 'subscription.updated': {
        console.log('Paddle event: subscription.updated', body.data?.id)
        break
      }

      case 'subscription.cancelled': {
        console.log('Paddle event: subscription.cancelled', body.data?.id)
        break
      }

      case 'subscription.past_due': {
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
