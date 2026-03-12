import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from './schema/index.js'
import { organizations } from './schema/organizations.js'
import { members } from './schema/members.js'
import { teams, teamMembers } from './schema/teams.js'
import { providerConfigs } from './schema/providers.js'
import { virtualKeys } from './schema/keys.js'
import { requestLogs } from './schema/request-logs.js'
import { budgets } from './schema/budgets.js'
import { subscriptions } from './schema/subscriptions.js'
import { invitations } from './schema/invitations.js'
import { auditLogs } from './schema/audit-logs.js'
import { guardrailRules } from './schema/guardrail-rules.js'
import { ssoConfigs } from './schema/sso-configs.js'

export type Database = PostgresJsDatabase<typeof schema>

export const createTenantQueries = (db: Database, orgId: string) => ({
  organization: () => db.select().from(organizations).where(eq(organizations.id, orgId)),
  members: () => db.select().from(members).where(eq(members.organizationId, orgId)),
  teams: () => db.select().from(teams).where(eq(teams.organizationId, orgId)),
  providers: () => db.select().from(providerConfigs).where(eq(providerConfigs.organizationId, orgId)),
  keys: () => db.select().from(virtualKeys).where(eq(virtualKeys.organizationId, orgId)),
  logs: () => db.select().from(requestLogs).where(eq(requestLogs.organizationId, orgId)),
  budgets: () => db.select().from(budgets).where(eq(budgets.organizationId, orgId)),
  subscriptions: () => db.select().from(subscriptions).where(eq(subscriptions.organizationId, orgId)),
  invitations: () => db.select().from(invitations).where(eq(invitations.organizationId, orgId)),
  auditLogs: () => db.select().from(auditLogs).where(eq(auditLogs.organizationId, orgId)),
  guardrailRules: () => db.select().from(guardrailRules).where(eq(guardrailRules.organizationId, orgId)),
  ssoConfig: () => db.select().from(ssoConfigs).where(eq(ssoConfigs.organizationId, orgId)),
})

export type TenantQueries = ReturnType<typeof createTenantQueries>

type TenantTable = typeof members | typeof teams | typeof teamMembers | typeof providerConfigs | typeof virtualKeys | typeof requestLogs | typeof budgets | typeof subscriptions | typeof invitations | typeof auditLogs | typeof guardrailRules | typeof ssoConfigs

export const insertWithTenant = <T extends TenantTable>(
  db: Database,
  table: T,
  orgId: string,
  values: Omit<T['$inferInsert'], 'organizationId'>,
) => db.insert(table).values({ ...values, organizationId: orgId } as T['$inferInsert'])
