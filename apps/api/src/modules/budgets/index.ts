import type { Database } from '@raven/db'
import { budgets } from '@raven/db'
import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { NotFoundError, ValidationError } from '../../lib/errors.js'

const createBudgetSchema = z.object({
  entityType: z.enum(['organization', 'team', 'key']),
  entityId: z.string().min(1),
  limitAmount: z.number().positive(),
  period: z.enum(['daily', 'monthly']).default('monthly'),
  alertThreshold: z.number().min(0).max(1).default(0.8),
})

const updateBudgetSchema = z.object({
  limitAmount: z.number().positive().optional(),
  alertThreshold: z.number().min(0).max(1).optional(),
  period: z.enum(['daily', 'monthly']).optional(),
})

export const createBudgetsModule = (db: Database) => {
  const app = new Hono()

  // GET / — List budgets for the org
  app.get('/', async (c) => {
    const orgId = c.get('orgId' as never) as string

    const rows = await db.select().from(budgets).where(eq(budgets.organizationId, orgId))

    return c.json(rows)
  })

  // POST / — Create a budget
  app.post('/', async (c) => {
    const orgId = c.get('orgId' as never) as string
    const body = await c.req.json()
    const result = createBudgetSchema.safeParse(body)

    if (!result.success) {
      throw new ValidationError('Invalid request body', {
        errors: result.error.flatten().fieldErrors,
      })
    }

    const { entityType, entityId, limitAmount, period, alertThreshold } = result.data

    const [created] = await db
      .insert(budgets)
      .values({
        organizationId: orgId,
        entityType,
        entityId,
        limitAmount: limitAmount.toFixed(2),
        period,
        alertThreshold: alertThreshold.toFixed(2),
      })
      .returning()

    return c.json(created, 201)
  })

  // PUT /:id — Update a budget
  app.put('/:id', async (c) => {
    const orgId = c.get('orgId' as never) as string
    const id = c.req.param('id')
    const body = await c.req.json()
    const result = updateBudgetSchema.safeParse(body)

    if (!result.success) {
      throw new ValidationError('Invalid request body', {
        errors: result.error.flatten().fieldErrors,
      })
    }

    const [existing] = await db
      .select({ id: budgets.id })
      .from(budgets)
      .where(and(eq(budgets.id, id), eq(budgets.organizationId, orgId)))
      .limit(1)

    if (!existing) {
      throw new NotFoundError('Budget not found')
    }

    const { limitAmount, alertThreshold, period } = result.data
    const updates: Partial<typeof budgets.$inferInsert> = {}

    if (limitAmount !== undefined) {
      updates.limitAmount = limitAmount.toFixed(2)
    }

    if (alertThreshold !== undefined) {
      updates.alertThreshold = alertThreshold.toFixed(2)
    }

    if (period !== undefined) {
      updates.period = period
    }

    const [updated] = await db
      .update(budgets)
      .set(updates)
      .where(and(eq(budgets.id, id), eq(budgets.organizationId, orgId)))
      .returning()

    return c.json(updated)
  })

  // DELETE /:id — Delete a budget
  app.delete('/:id', async (c) => {
    const orgId = c.get('orgId' as never) as string
    const id = c.req.param('id')

    const [existing] = await db
      .select({ id: budgets.id })
      .from(budgets)
      .where(and(eq(budgets.id, id), eq(budgets.organizationId, orgId)))
      .limit(1)

    if (!existing) {
      throw new NotFoundError('Budget not found')
    }

    await db.delete(budgets).where(and(eq(budgets.id, id), eq(budgets.organizationId, orgId)))

    return c.json({ success: true })
  })

  return app
}
