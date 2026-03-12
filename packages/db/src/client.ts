import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema/index.js'

export const createDatabase = (url: string) => {
  const client = postgres(url, { max: 20, idle_timeout: 30 })
  return drizzle(client, { schema })
}
