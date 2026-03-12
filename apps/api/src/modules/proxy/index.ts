import type { Env } from '@raven/config'
import type { Database } from '@raven/db'
import { Hono } from 'hono'
import type { Redis } from 'ioredis'
import { proxyHandler } from './handler.js'

export const createProxyModule = (db: Database, redis: Redis, env: Env) => {
  const app = new Hono()
  app.all('/*', proxyHandler(db, redis, env))
  return app
}
