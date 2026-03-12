import { numeric, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'
import { organizations } from './organizations.js'

export const budgetEntityTypeEnum = pgEnum('budget_entity_type', ['organization', 'team', 'key'])
export const budgetPeriodEnum = pgEnum('budget_period', ['daily', 'monthly'])

export const budgets = pgTable('budgets', {
  id: text('id').primaryKey().$defaultFn(createId),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  entityType: budgetEntityTypeEnum('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  limitAmount: numeric('limit_amount', { precision: 12, scale: 2 }).notNull(),
  period: budgetPeriodEnum('period').notNull().default('monthly'),
  alertThreshold: numeric('alert_threshold', { precision: 3, scale: 2 }).notNull().default('0.80'),
  periodStart: timestamp('period_start', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
