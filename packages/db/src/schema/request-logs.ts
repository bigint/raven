import { createId } from '@paralleldrive/cuid2'
import { boolean, index, integer, numeric, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { virtualKeys } from './keys'
import { organizations } from './organizations'

export const requestLogs = pgTable(
  'request_logs',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    virtualKeyId: text('virtual_key_id')
      .notNull()
      .references(() => virtualKeys.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    model: text('model').notNull(),
    method: text('method').notNull(),
    path: text('path').notNull(),
    statusCode: integer('status_code').notNull(),
    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    cachedTokens: integer('cached_tokens').notNull().default(0),
    cost: numeric('cost', { precision: 12, scale: 6 }).notNull().default('0'),
    latencyMs: integer('latency_ms').notNull().default(0),
    cacheHit: boolean('cache_hit').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('request_logs_org_created_idx').on(t.organizationId, t.createdAt)],
)
