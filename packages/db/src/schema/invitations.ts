import { createId } from '@paralleldrive/cuid2'
import { pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'
import { users } from './users'

export const invitations = pgTable(
  'invitations',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: text('role').notNull().default('member'),
    status: text('status').notNull().default('pending'),
    inviterId: text('inviter_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('invitations_org_email_unique').on(t.organizationId, t.email)],
)
