import { boolean, integer, jsonb, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'
import { organizations } from './organizations.js'

export const guardrailTypeEnum = pgEnum('guardrail_type', ['block_topics', 'pii_detection', 'content_filter', 'custom_regex'])
export const guardrailActionEnum = pgEnum('guardrail_action', ['block', 'warn', 'log'])

export const guardrailRules = pgTable('guardrail_rules', {
  id: text('id').primaryKey().$defaultFn(createId),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: guardrailTypeEnum('type').notNull(),
  config: jsonb('config').$type<Record<string, unknown>>().notNull(),
  action: guardrailActionEnum('action').notNull().default('log'),
  isEnabled: boolean('is_enabled').notNull().default(true),
  priority: integer('priority').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
