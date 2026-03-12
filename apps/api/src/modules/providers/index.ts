import type { Env } from '@raven/config'
import type { Database } from '@raven/db'
import { Hono } from 'hono'
import { createProvider } from './create.js'
import { deleteProvider } from './delete.js'
import { getProvider } from './get.js'
import { listProviders } from './list.js'
import { updateProvider } from './update.js'

export const createProvidersModule = (db: Database, env: Env) => {
  const app = new Hono()

  app.get('/', listProviders(db))
  app.get('/:id', getProvider(db))
  app.post('/', createProvider(db, env))
  app.put('/:id', updateProvider(db, env))
  app.delete('/:id', deleteProvider(db))

  return app
}
