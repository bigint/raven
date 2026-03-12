import type { Database } from '@raven/db'
import type { Context } from 'hono'

export const handleWebhook = (_db: Database) => async (c: Context) => {
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
}
