import { pgEnum, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'
import { organizations } from './organizations.js'
import { users } from './users.js'

export const teamRoleEnum = pgEnum('team_role', ['lead', 'member'])

export const teams = pgTable('teams', {
  id: text('id').primaryKey().$defaultFn(createId),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const teamMembers = pgTable('team_members', {
  id: text('id').primaryKey().$defaultFn(createId),
  teamId: text('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: teamRoleEnum('role').notNull().default('member'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique('team_members_team_user_unique').on(t.teamId, t.userId),
])
