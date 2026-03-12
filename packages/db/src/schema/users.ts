import { createId } from '@paralleldrive/cuid2'
import { boolean, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const platformRoleEnum = pgEnum('platform_role', ['user', 'admin'])

export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(createId),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  role: platformRoleEnum('role').notNull().default('user'),
  emailVerified: boolean('email_verified').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
