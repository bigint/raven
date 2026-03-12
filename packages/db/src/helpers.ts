import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { auditLogs } from './schema/audit-logs'
import { budgets } from './schema/budgets'
import { guardrailRules } from './schema/guardrail-rules'
import type * as schema from './schema/index'
import { invitations } from './schema/invitations'
import { virtualKeys } from './schema/keys'
import { members } from './schema/members'
import { organizations } from './schema/organizations'
import { providerConfigs } from './schema/providers'
import { requestLogs } from './schema/request-logs'
import { ssoConfigs } from './schema/sso-configs'
import { subscriptions } from './schema/subscriptions'
import { type teamMembers, teams } from './schema/teams'

export type Database = PostgresJsDatabase<typeof schema>

export const createTenantQueries = (db: Database, orgId: string) => ({
  organization: () => db.select().from(organizations).where(eq(organizations.id, orgId)),
  members: () => db.select().from(members).where(eq(members.organizationId, orgId)),
  teams: () => db.select().from(teams).where(eq(teams.organizationId, orgId)),
  providers: () =>
    db.select().from(providerConfigs).where(eq(providerConfigs.organizationId, orgId)),
  keys: () => db.select().from(virtualKeys).where(eq(virtualKeys.organizationId, orgId)),
  logs: () => db.select().from(requestLogs).where(eq(requestLogs.organizationId, orgId)),
  budgets: () => db.select().from(budgets).where(eq(budgets.organizationId, orgId)),
  subscriptions: () =>
    db.select().from(subscriptions).where(eq(subscriptions.organizationId, orgId)),
  invitations: () => db.select().from(invitations).where(eq(invitations.organizationId, orgId)),
  auditLogs: () => db.select().from(auditLogs).where(eq(auditLogs.organizationId, orgId)),
  guardrailRules: () =>
    db.select().from(guardrailRules).where(eq(guardrailRules.organizationId, orgId)),
  ssoConfig: () => db.select().from(ssoConfigs).where(eq(ssoConfigs.organizationId, orgId)),
})

export type TenantQueries = ReturnType<typeof createTenantQueries>

type TenantTable =
  | typeof members
  | typeof teams
  | typeof teamMembers
  | typeof providerConfigs
  | typeof virtualKeys
  | typeof requestLogs
  | typeof budgets
  | typeof subscriptions
  | typeof invitations
  | typeof auditLogs
  | typeof guardrailRules
  | typeof ssoConfigs

export const insertWithTenant = <T extends TenantTable>(
  db: Database,
  table: T,
  orgId: string,
  values: Omit<T['$inferInsert'], 'organizationId'>,
  // biome-ignore lint/suspicious/noExplicitAny: drizzle union table type narrowing
) => db.insert(table as any).values({ ...values, organizationId: orgId })
