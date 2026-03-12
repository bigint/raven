import type { Database } from '@raven/db'
import { budgets } from '@raven/db'
import { eq } from 'drizzle-orm'
import type { Context } from 'hono'

export const listBudgets = (db: Database) => async (c: Context) => {
  const orgId = c.get('orgId' as never) as string

  const rows = await db.select().from(budgets).where(eq(budgets.organizationId, orgId))

  return c.json(rows)
}
