import { Hono } from 'hono'
import type { Auth } from '@raven/auth'

export const createAuthModule = (auth: Auth) => {
  const app = new Hono()

  app.all('/*', (c) => {
    return auth.handler(c.req.raw)
  })

  return app
}
