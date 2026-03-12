import { createId } from '@paralleldrive/cuid2'
import { boolean, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'

export const ssoProviderEnum = pgEnum('sso_provider', ['saml', 'oidc'])

export const ssoConfigs = pgTable('sso_configs', {
  id: text('id').primaryKey().$defaultFn(createId),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' })
    .unique(),
  provider: ssoProviderEnum('provider').notNull(),
  issuerUrl: text('issuer_url').notNull(),
  ssoUrl: text('sso_url').notNull(),
  certificate: text('certificate').notNull(),
  isEnabled: boolean('is_enabled').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
