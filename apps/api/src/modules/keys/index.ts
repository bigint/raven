import type { Database } from '@raven/db'
import { Hono } from 'hono'
import { createKey } from './create.js'
import { deleteKey } from './delete.js'
import { getKey } from './get.js'
import { listKeys } from './list.js'
import { updateKey } from './update.js'

export const createKeysModule = (db: Database) => {
  const app = new Hono()

  app.get('/', listKeys(db))
  app.get('/:id', getKey(db))
  app.post('/', createKey(db))
  app.put('/:id', updateKey(db))
  app.delete('/:id', deleteKey(db))

  return app
}
