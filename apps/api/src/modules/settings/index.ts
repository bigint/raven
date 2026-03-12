import type { Database } from '@raven/db'
import { Hono } from 'hono'
import { deleteSettings } from './delete.js'
import { getSettings } from './get.js'
import { updateSettings } from './update.js'

export const createSettingsModule = (db: Database) => {
  const app = new Hono()
  app.get('/', getSettings(db))
  app.put('/', updateSettings(db))
  app.delete('/', deleteSettings(db))
  return app
}
