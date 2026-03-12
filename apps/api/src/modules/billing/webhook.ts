import type { Database } from '@raven/db'
import type { Context } from 'hono'
import { publishEvent } from '../../lib/events.js'

export const handleWebhook = (_db: Database) => async (c: Context) => {
  const signature = c.req.header('Paddle-Signature')

  if (!signature) {
    return c.json({ code: 'VALIDATION_ERROR', message: 'Missing Paddle-Signature header' }, 400)
  }

  const body = await c.req.json()
  const eventType: string = body?.event_type ?? ''
  const orgId: string | undefined = body?.data?.custom_data?.org_id

  switch (eventType) {
    case 'subscription.created': {
      console.log('Paddle event: subscription.created', body.data?.id)
      if (orgId) {
        void publishEvent(orgId, 'subscription.updated', body.data)
      }
      break
    }

    case 'subscription.updated': {
      console.log('Paddle event: subscription.updated', body.data?.id)
      if (orgId) {
        void publishEvent(orgId, 'subscription.updated', body.data)
      }
      break
    }

    case 'subscription.cancelled': {
      console.log('Paddle event: subscription.cancelled', body.data?.id)
      if (orgId) {
        void publishEvent(orgId, 'subscription.updated', body.data)
      }
      break
    }

    case 'subscription.past_due': {
      console.log('Paddle event: subscription.past_due', body.data?.id)
      if (orgId) {
        void publishEvent(orgId, 'subscription.updated', body.data)
      }
      break
    }

    default: {
      console.log('Paddle event (unhandled):', eventType)
      break
    }
  }

  return c.json({ received: true })
}
