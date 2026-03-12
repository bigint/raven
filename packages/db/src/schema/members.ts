import { createId } from '@paralleldrive/cuid2'
import { pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'
import { users } from './users'

export const members = pgTable(
  'members',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('member'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('members_org_user_unique').on(t.organizationId, t.userId)],
)
