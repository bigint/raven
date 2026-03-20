# Raven Open-Source Transformation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Raven from a multi-tenant SaaS with tiered billing into a fully open-source, self-hosted AI model gateway with Docker support.

**Architecture:** Surgical removal of billing, organizations, and feature gating. Single workspace with three roles (admin/member/viewer). Admin UI moved into main sidebar as tabbed page. Docker image with docker-compose for one-command deployment.

**Tech Stack:** Next.js 16, Hono, Drizzle ORM, PostgreSQL, Redis, TypeScript, pnpm monorepo

**Spec:** `docs/superpowers/specs/2026-03-20-open-source-transformation-design.md`

**Note:** Per project conventions (CLAUDE.md), no test files are added. Validation is done via typecheck and build.

---

## Phase 1: Database & Foundation

### Task 1: Update Database Schema — Remove Org References from All Tables

**Files:**
- Modify: `packages/db/src/schema/users.ts`
- Modify: `packages/db/src/schema/auth.ts`
- Modify: `packages/db/src/schema/virtual-keys.ts` (actual filename: `keys.ts`)
- Modify: `packages/db/src/schema/provider-configs.ts` (actual filename: `providers.ts`)
- Modify: `packages/db/src/schema/request-logs.ts`
- Modify: `packages/db/src/schema/audit-logs.ts`
- Modify: `packages/db/src/schema/budgets.ts`
- Modify: `packages/db/src/schema/guardrail-rules.ts`
- Modify: `packages/db/src/schema/routing-rules.ts`
- Modify: `packages/db/src/schema/webhooks.ts`
- Modify: `packages/db/src/schema/prompts.ts`
- Create: `packages/db/src/schema/settings.ts`
- Modify: `packages/db/src/schema/index.ts`
- Delete: `packages/db/src/schema/organizations.ts`
- Delete: `packages/db/src/schema/members.ts`
- Delete: `packages/db/src/schema/invitations.ts`
- Delete: `packages/db/src/schema/subscriptions.ts`

- [ ] **Step 1: Delete organization-related schema files**

Delete these 4 files:
```
packages/db/src/schema/organizations.ts
packages/db/src/schema/members.ts
packages/db/src/schema/invitations.ts
packages/db/src/schema/subscriptions.ts
```

- [ ] **Step 2: Update `users.ts` — change role enum**

Change `platformRoleEnum` from `["user", "admin"]` to `["admin", "member", "viewer"]` and update the default from `"user"` to `"viewer"`:

```typescript
import { createId } from "@paralleldrive/cuid2";
import { boolean, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const platformRoleEnum = pgEnum("platform_role", ["admin", "member", "viewer"]);

export const users = pgTable("users", {
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  id: text("id").primaryKey().$defaultFn(createId),
  name: text("name").notNull(),
  role: platformRoleEnum("role").notNull().default("viewer"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
});
```

- [ ] **Step 3: Update `auth.ts` — remove `activeOrganizationId` from sessions**

Remove the `activeOrganizationId` field from the sessions table. Keep everything else identical.

- [ ] **Step 4: Update `keys.ts` (virtualKeys) — remove organizationId**

Remove the `organizationId` field, its import of `organizations`, and update the index from `(organizationId, isActive)` to just `(isActive)`:

```typescript
import { createId } from "@paralleldrive/cuid2";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp
} from "drizzle-orm/pg-core";

export const keyEnvironmentEnum = pgEnum("key_environment", ["live", "test"]);

export const virtualKeys = pgTable(
  "virtual_keys",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    environment: keyEnvironmentEnum("environment").notNull().default("live"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    id: text("id").primaryKey().$defaultFn(createId),
    isActive: boolean("is_active").notNull().default(true),
    keyHash: text("key_hash").notNull().unique(),
    keyPrefix: text("key_prefix").notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    name: text("name").notNull(),
    rateLimitRpd: integer("rate_limit_rpd"),
    rateLimitRpm: integer("rate_limit_rpm")
  },
  (t) => [
    index("virtual_keys_key_hash_idx").on(t.keyHash),
    index("virtual_keys_active_idx").on(t.isActive)
  ]
);
```

- [ ] **Step 5: Update `providers.ts` (providerConfigs) — remove organizationId**

Remove `organizationId` field, its import of `organizations`, and update index from `(organizationId, provider, isEnabled)` to `(provider, isEnabled)`:

```typescript
import { createId } from "@paralleldrive/cuid2";
import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const providerConfigs = pgTable(
  "provider_configs",
  {
    apiKey: text("api_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: text("id").primaryKey().$defaultFn(createId),
    isEnabled: boolean("is_enabled").notNull().default(true),
    name: text("name"),
    provider: text("provider").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (t) => [
    index("provider_configs_provider_enabled_idx").on(t.provider, t.isEnabled)
  ]
);
```

- [ ] **Step 6: Update `request-logs.ts` — remove organizationId**

Remove `organizationId` field, its import of `organizations`, and simplify all indexes to remove the org prefix. The new indexes:

```typescript
(t) => [
  index("request_logs_created_idx").on(t.createdAt),
  index("request_logs_key_created_idx").on(t.virtualKeyId, t.createdAt),
  index("request_logs_session_created_idx").on(t.sessionId, t.createdAt),
  index("request_logs_provider_model_created_idx").on(t.provider, t.model, t.createdAt),
  index("request_logs_status_created_idx").on(t.statusCode, t.createdAt),
  index("request_logs_deleted_created_idx").on(t.deletedAt, t.createdAt),
  index("request_logs_model_created_idx").on(t.model, t.createdAt),
  index("request_logs_enduser_created_idx").on(t.endUser, t.createdAt)
]
```

- [ ] **Step 7: Update `audit-logs.ts` — remove organizationId**

Remove `organizationId` field, its import of `organizations`, and simplify indexes:

```typescript
(t) => [
  index("audit_logs_created_idx").on(t.createdAt),
  index("audit_logs_action_idx").on(t.action),
  index("audit_logs_resource_type_idx").on(t.resourceType),
  index("audit_logs_actor_idx").on(t.actorId)
]
```

- [ ] **Step 8: Update `budgets.ts` — remove organizationId, change entityType enum**

Remove `organizationId`, update `budgetEntityTypeEnum` from `["organization", "key"]` to `["global", "key"]`, update index:

```typescript
import { createId } from "@paralleldrive/cuid2";
import {
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp
} from "drizzle-orm/pg-core";

export const budgetEntityTypeEnum = pgEnum("budget_entity_type", [
  "global",
  "key"
]);
export const budgetPeriodEnum = pgEnum("budget_period", ["daily", "monthly"]);

export const budgets = pgTable(
  "budgets",
  {
    alertThreshold: numeric("alert_threshold", { precision: 5, scale: 2 })
      .notNull()
      .default("0.80"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    entityId: text("entity_id").notNull(),
    entityType: budgetEntityTypeEnum("entity_type").notNull(),
    id: text("id").primaryKey().$defaultFn(createId),
    limitAmount: numeric("limit_amount", { precision: 12, scale: 2 }).notNull(),
    period: budgetPeriodEnum("period").notNull().default("monthly")
  },
  (t) => [index("budgets_entity_idx").on(t.entityType, t.entityId)]
);
```

- [ ] **Step 9: Update `guardrail-rules.ts` — remove organizationId**

Remove `organizationId` field, organizations import, update index from `(organizationId, isEnabled)` to `(isEnabled)`.

- [ ] **Step 10: Update `routing-rules.ts` — remove organizationId**

Remove `organizationId` field, organizations import, update index from `(organizationId, sourceModel, isEnabled)` to `(sourceModel, isEnabled)`.

- [ ] **Step 11: Update `webhooks.ts` — remove organizationId**

Remove `organizationId` field, organizations import, update index from `(organizationId, isEnabled)` to `(isEnabled)`.

- [ ] **Step 12: Update `prompts.ts` — remove organizationId**

Remove `organizationId` field from prompts table, organizations import, update index from `(organizationId, name)` to `(name)`. Keep `promptVersions` unchanged.

- [ ] **Step 13: Create `settings.ts` — new system settings table**

```typescript
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  value: text("value").notNull()
});
```

- [ ] **Step 14: Update `index.ts` — schema barrel file**

Rewrite the barrel export to remove deleted tables and add settings:

```typescript
export { auditLogs } from "./audit-logs";
export { accounts, sessions, verifications } from "./auth";
export { budgetEntityTypeEnum, budgetPeriodEnum, budgets } from "./budgets";
export {
  guardrailActionEnum,
  guardrailRules,
  guardrailTypeEnum
} from "./guardrail-rules";
export { keyEnvironmentEnum, virtualKeys } from "./keys";
export { models } from "./models";
export { prompts, promptVersions } from "./prompts";
export { providerConfigs } from "./providers";
export { requestLogs } from "./request-logs";
export { routingRules } from "./routing-rules";
export { settings } from "./settings";
export { platformRoleEnum, users } from "./users";
export { webhooks } from "./webhooks";
```

- [ ] **Step 15: Generate and review migration**

Run: `cd /Users/yoginth/raven && pnpm db:generate`

Review the generated SQL migration file in `packages/db/drizzle/`. It should:
- Drop organizations, members, invitations, subscriptions tables
- Drop organizationId columns from all tables
- Drop activeOrganizationId from sessions
- Create settings table
- Alter platform_role enum
- Alter budget_entity_type enum

If Drizzle doesn't handle the enum alterations and data migration automatically, write a custom SQL migration that:
1. Maps existing `platform_role = 'user'` to `'member'`
2. Maps existing `budget_entity_type = 'organization'` to `'global'`
3. Updates budget `entityId` from org IDs to `'workspace'` where `entityType` was `'organization'`
4. Inserts default settings rows
5. Drops the `planEnum` and `subscriptionStatusEnum` enums

- [ ] **Step 16: Commit**

```bash
git add -A packages/db/
git commit -m "feat: update database schema for open-source transformation

Remove organizations, members, invitations, subscriptions tables.
Remove organizationId from all resource tables.
Add settings table. Update role and budget enums."
```

---

### Task 2: Update Types & Config Packages

**Files:**
- Delete: `packages/types/src/billing.ts`
- Modify: `packages/types/src/constants.ts`
- Modify: `packages/types/src/index.ts` (if it re-exports billing)
- Modify: `packages/config/src/env.ts`
- Modify: `.env.example`

- [ ] **Step 1: Delete billing types**

Delete `packages/types/src/billing.ts` entirely.

- [ ] **Step 2: Remove billing re-exports from types index**

In `packages/types/src/index.ts`, remove any `export * from "./billing"` or similar line. Check for any remaining references to `Plan`, `PlanFeatures`, `PLAN_DETAILS`, `PLAN_FEATURES` in the types package.

- [ ] **Step 3: Update constants.ts**

Keep `ROLE_OPTIONS` and `ENVIRONMENT_OPTIONS` as-is. They already have the right values (member, admin, viewer).

- [ ] **Step 4: Update `packages/config/src/env.ts`**

Remove these fields from the Zod schema:
- `LEMONSQUEEZY_API_KEY`
- `LEMONSQUEEZY_WEBHOOK_SECRET`
- `CRON_SECRET`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ZONE_ID`

Keep everything else including `ENCRYPTION_SECRET_PREVIOUS`, `RESEND_API_KEY`, GitHub/Google OAuth vars.

- [ ] **Step 5: Update `.env.example`**

Rewrite to match the spec's required/optional variable list. Remove all LemonSqueezy, Cloudflare, and Cron vars.

- [ ] **Step 6: Commit**

```bash
git add packages/types/ packages/config/ .env.example
git commit -m "feat: remove billing types and simplify env config"
```

---

### Task 3: Update Auth Package — Remove Organization Plugin

**Files:**
- Modify: `packages/auth/src/server.ts`
- Modify: `packages/auth/src/client.ts` (if it exports org-related functions)

- [ ] **Step 1: Update `server.ts`**

In the betterAuth configuration, remove the `organization()` plugin from the `plugins` array. Keep everything else (email/password, GitHub, Google, session config, hooks).

Also update the `user.fields` or schema mapping if the auth config references the organization plugin's tables.

- [ ] **Step 2: Update `client.ts`**

If the auth client exports any organization-related methods (like `organization.create`, `organization.setActive`), remove those exports.

- [ ] **Step 3: Commit**

```bash
git add packages/auth/
git commit -m "feat: remove organization plugin from better-auth config"
```

---

## Phase 2: API Backend

### Task 4: Update API Middleware

**Files:**
- Delete: `apps/api/src/middleware/tenant.ts`
- Modify: `apps/api/src/middleware/auth.ts`
- Modify: `apps/api/src/middleware/platform-admin.ts`
- Create: `apps/api/src/middleware/writer.ts`
- Modify: `apps/api/src/lib/types.ts`

- [ ] **Step 1: Delete tenant middleware**

Delete `apps/api/src/middleware/tenant.ts`.

- [ ] **Step 2: Update `types.ts` — remove org context types**

Remove `orgId` and `orgRole` from the context types. The new types should be:

```typescript
import type { Context } from "hono";

export type User = {
  email: string;
  id: string;
  name: string;
  role: "admin" | "member" | "viewer";
};

export type Session = {
  id: string;
};

// For routes that require authentication only
export type AuthEnv = {
  Variables: {
    session: Session;
    user: User;
  };
};

export type AuthContext = Context<AuthEnv>;
export type AuthContextWithJson<T> = Context<AuthEnv, string, { in: { json: T }; out: { json: T } }>;
```

Remove the `AppEnv` type (which had orgId/orgRole) and `AppContext`/`AppContextWithJson` types. All handlers will use `AuthContext`/`AuthContextWithJson` instead.

- [ ] **Step 3: Update `auth.ts` middleware**

Simplify to just validate session and set user/session context. Remove any org-related context setting. The user.role should come from the database user record.

- [ ] **Step 4: Create `writer.ts` middleware**

```typescript
import { ForbiddenError } from "@/lib/errors";
import type { AuthContext } from "@/lib/types";
import type { Next } from "hono";

export const createWriterMiddleware = () => async (c: AuthContext, next: Next) => {
  const user = c.get("user");
  if (user.role === "viewer") {
    throw new ForbiddenError("Viewers have read-only access");
  }
  return next();
};
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/middleware/ apps/api/src/lib/types.ts
git commit -m "feat: simplify middleware stack - remove tenant, add writer"
```

---

### Task 5: Delete Billing, Teams, and Org Settings Modules

**Files:**
- Delete: `apps/api/src/modules/billing/` (entire directory)
- Delete: `apps/api/src/modules/teams/` (entire directory)
- Delete: `apps/api/src/modules/settings/` (entire directory)
- Delete: `apps/api/src/modules/proxy/plan-gate.ts`
- Delete: `apps/api/src/modules/proxy/plan-check.ts`
- Delete: `apps/api/src/modules/user/invitations.ts`
- Modify: `apps/api/src/modules/user/index.ts`
- Modify: `apps/api/src/modules/user/orgs.ts` → simplify to profile-only
- Modify: `apps/api/src/modules/user/schema.ts`

- [ ] **Step 1: Delete entire billing module**

```bash
rm -rf apps/api/src/modules/billing/
```

- [ ] **Step 2: Delete entire teams module**

```bash
rm -rf apps/api/src/modules/teams/
```

- [ ] **Step 3: Delete entire org settings module**

```bash
rm -rf apps/api/src/modules/settings/
```

- [ ] **Step 4: Delete plan gate and plan check files**

```bash
rm apps/api/src/modules/proxy/plan-gate.ts
rm apps/api/src/modules/proxy/plan-check.ts
```

- [ ] **Step 5: Delete user invitations handler**

```bash
rm apps/api/src/modules/user/invitations.ts
```

- [ ] **Step 6: Rewrite `user/orgs.ts` → `user/profile.ts`**

Delete `orgs.ts`. The user module should only have profile management now. If there's already a `profile.ts`, keep it. If `orgs.ts` is the only file handling profile, rename and rewrite to just handle profile updates.

- [ ] **Step 7: Update `user/index.ts`**

Remove all invitation routes, org routes. Keep only profile:

```typescript
import type { Database } from "@raven/db";
import { Hono } from "hono";
import { jsonValidator } from "@/lib/validation";
import { updateProfile } from "./profile";
import { updateProfileSchema } from "./schema";

export const createUserModule = (db: Database) => {
  const app = new Hono();
  app.put("/profile", jsonValidator(updateProfileSchema), updateProfile(db));
  return app;
};
```

- [ ] **Step 8: Update `user/schema.ts`**

Remove `createOrgSchema`, `inviteSchema`, and any other org/team related schemas. Keep `updateProfileSchema`.

- [ ] **Step 9: Commit**

```bash
git add -A apps/api/src/modules/
git commit -m "feat: remove billing, teams, settings, and plan-gating modules"
```

---

### Task 6: Remove Feature Gates from Create Handlers

**Files:**
- Modify: `apps/api/src/modules/providers/create.ts`
- Modify: `apps/api/src/modules/keys/create.ts`
- Modify: `apps/api/src/modules/budgets/create.ts`
- Modify: `apps/api/src/modules/guardrails/create.ts`
- Modify: `apps/api/src/modules/webhooks/create.ts`

- [ ] **Step 1: Update `providers/create.ts`**

Remove `import { checkResourceLimit } from "@/modules/proxy/plan-gate"` and the `checkResourceLimit(db, orgId, "maxProviders", ...)` call. Replace `orgId = c.get("orgId")` with just using `c.get("user")` for audit logging. Remove `organizationId: orgId` from the insert. Update `publishEvent` calls to not use orgId.

- [ ] **Step 2: Update `keys/create.ts`**

Same pattern: remove `checkResourceLimit` import and call, remove `organizationId` from insert values, update event publishing and audit logging.

- [ ] **Step 3: Update `budgets/create.ts`**

Same pattern: remove `checkResourceLimit` import and call, remove `organizationId` from insert values.

- [ ] **Step 4: Update `guardrails/create.ts`**

Remove `checkFeatureGate` import and call, remove `organizationId` from insert values.

- [ ] **Step 5: Update `webhooks/create.ts`**

Remove `checkFeatureGate` import and call, remove `organizationId` from insert values.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/providers/create.ts apps/api/src/modules/keys/create.ts apps/api/src/modules/budgets/create.ts apps/api/src/modules/guardrails/create.ts apps/api/src/modules/webhooks/create.ts
git commit -m "feat: remove all feature gates and resource limits from handlers"
```

---

### Task 7: Remove orgId from All Module Handlers

This task covers every remaining handler that references `orgId`, `organizationId`, or `c.get("orgId")`. Each module's list, get, update, delete handlers need updating.

**Files:**
- Modify: All `list.ts`, `update.ts`, `delete.ts`, `get.ts` files in:
  - `apps/api/src/modules/providers/`
  - `apps/api/src/modules/keys/`
  - `apps/api/src/modules/budgets/`
  - `apps/api/src/modules/guardrails/`
  - `apps/api/src/modules/webhooks/`
  - `apps/api/src/modules/routing-rules/`
  - `apps/api/src/modules/prompts/`
  - `apps/api/src/modules/audit-logs/`
  - `apps/api/src/modules/request-logs/` (if exists)

- [ ] **Step 1: For each module, search and replace pattern**

In every handler file:
1. Replace `c.get("orgId")` references — remove them
2. Replace `eq(table.organizationId, orgId)` in WHERE clauses — remove the condition (resources are now global)
3. Replace `organizationId: orgId` in INSERT values — remove the field
4. Update type imports from `AppContext`/`AppContextWithJson` to `AuthContext`/`AuthContextWithJson`
5. Update `publishEvent(orgId, ...)` calls — see Task 8 for new event signature
6. Update `logAudit(db, { orgId, ... })` calls — remove orgId field

Do this for every `.ts` file in each module directory. Use grep to find all occurrences:

```bash
grep -r "orgId\|organizationId\|AppContext\|AppEnv" apps/api/src/modules/ --include="*.ts" -l
```

- [ ] **Step 2: Update module index files**

Update each module's `index.ts` to use `AuthEnv` instead of `AppEnv` in their Hono type parameter:

```typescript
const app = new Hono<AuthEnv>();
```

Or simply `new Hono()` if the type isn't needed.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/
git commit -m "feat: remove orgId from all API module handlers"
```

---

### Task 8: Update Core Libraries — Events, Cache, Webhook Dispatcher, Email Dispatcher

**Files:**
- Modify: `apps/api/src/lib/events.ts`
- Modify: `apps/api/src/lib/cache-utils.ts`
- Modify: `apps/api/src/lib/webhook-dispatcher.ts`
- Modify: `apps/api/src/lib/email-dispatcher.ts`

- [ ] **Step 1: Update `events.ts`**

Change event channel from `org:{orgId}:events` to a global `raven:events` channel:

```typescript
export const publishEvent = async (
  type: string,
  data: unknown
) => {
  // ... publish to "raven:events" channel
};
```

Remove the `orgId` parameter from `publishEvent`. Update all callers (already handled in Tasks 6-7 but verify no stragglers).

- [ ] **Step 2: Update `cache-utils.ts`**

Remove org-prefixed cache keys. Update key builders:
- `cacheKeys.budget(keyId)` instead of `budget(orgId, keyId)`
- `cacheKeys.providerConfigs(provider)` instead of `providerConfigs(orgId, provider)`
- Remove `cacheKeys.plan(orgId)` entirely (no plans)
- Keep `cacheKeys.virtualKey(keyHash)` as-is
- Keep `cacheKeys.providerModels(configId)` as-is

- [ ] **Step 3: Update `webhook-dispatcher.ts`**

Change subscription pattern from `org:*:events` to `raven:events`. Remove org-scoped webhook config caching — load all enabled webhooks globally. Remove orgId from webhook lookup queries.

- [ ] **Step 4: Update `email-dispatcher.ts`**

Change subscription pattern from `org:*:events` to `raven:events`. Remove the `invitation.created` event handler (no invitations). Keep `budget.alert` handler but update it to email admin users instead of org owners.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/
git commit -m "feat: update event system and dispatchers for single workspace"
```

---

### Task 9: Update Analytics & Proxy Handlers

**Files:**
- Modify: `apps/api/src/modules/analytics/helpers.ts`
- Modify: `apps/api/src/modules/analytics/index.ts`
- Modify: `apps/api/src/modules/proxy/handler.ts`
- Modify: `apps/api/src/modules/proxy/budget-check.ts`

- [ ] **Step 1: Rewrite `analytics/helpers.ts`**

Replace `clampAnalyticsRetention` to read from settings table instead of plan:

```typescript
import type { Database } from "@raven/db";
import { settings } from "@raven/db";
import { eq } from "drizzle-orm";
import { subDays, startOfDay, format } from "date-fns";

export const getRetentionDays = async (db: Database): Promise<number> => {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, "analytics_retention_days"));
  return row ? Number.parseInt(row.value, 10) : 365;
};

export const clampAnalyticsRetention = async (
  db: Database,
  from: string | undefined
): Promise<string | null> => {
  const retentionDays = await getRetentionDays(db);
  const earliest = startOfDay(subDays(new Date(), retentionDays));
  const fromDate = from ? new Date(from) : null;

  if (!fromDate || fromDate < earliest) {
    return format(earliest, "yyyy-MM-dd");
  }
  return null;
};
```

Remove the `redis` parameter and plan-checking logic.

- [ ] **Step 2: Update `analytics/index.ts`**

Update the middleware that calls `clampAnalyticsRetention` to remove `orgId` and `redis` parameters. Update the `AppEnv` type to `AuthEnv`.

- [ ] **Step 3: Update `proxy/handler.ts`**

Remove the `checkPlanLimit()` call from the parallel gate checks. Remove its import. Keep rate limiting, budget checks, and guardrail evaluation. Remove all `orgId` references — the proxy should resolve the virtual key and then work globally.

- [ ] **Step 4: Update `proxy/budget-check.ts`**

Remove `orgId` from budget lookups. Budget queries should look up by `entityType` and `entityId` without org scoping.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/analytics/ apps/api/src/modules/proxy/
git commit -m "feat: update analytics and proxy for settings-based retention"
```

---

### Task 10: New Admin API — Settings, User Management, Model Sync

**Files:**
- Create: `apps/api/src/modules/admin/settings.ts`
- Create: `apps/api/src/modules/admin/retention.ts`
- Modify: `apps/api/src/modules/admin/users.ts`
- Modify: `apps/api/src/modules/admin/stats.ts`
- Modify: `apps/api/src/modules/admin/index.ts`
- Delete: `apps/api/src/modules/admin/organizations.ts`

- [ ] **Step 1: Delete `admin/organizations.ts`**

```bash
rm apps/api/src/modules/admin/organizations.ts
```

- [ ] **Step 2: Create `admin/settings.ts`**

```typescript
import type { Database } from "@raven/db";
import { settings } from "@raven/db";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { success } from "@/lib/response";

const DEFAULT_SETTINGS: Record<string, string> = {
  allow_registration: "true",
  analytics_retention_days: "365",
  instance_name: "Raven"
};

export const getSettings = (db: Database) => async (c: Context) => {
  const rows = await db.select().from(settings);
  const result = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return success(c, result);
};

export const updateSettings = (db: Database) => async (c: Context) => {
  const body = await c.req.json<Record<string, string>>();
  for (const [key, value] of Object.entries(body)) {
    if (key in DEFAULT_SETTINGS) {
      await db
        .insert(settings)
        .values({ key, value: String(value), updatedAt: new Date() })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: String(value), updatedAt: new Date() }
        });
    }
  }
  return success(c, { updated: true });
};

export const getPublicSettings = (db: Database) => async (c: Context) => {
  const rows = await db
    .select()
    .from(settings)
    .where(eq(settings.key, "instance_name"))
    .union(
      db.select().from(settings).where(eq(settings.key, "allow_registration"))
    );
  const result: Record<string, string> = {
    allow_registration: "true",
    instance_name: "Raven"
  };
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return success(c, result);
};
```

- [ ] **Step 3: Create `admin/retention.ts`**

```typescript
import type { Database } from "@raven/db";
import { auditLogs, requestLogs, settings } from "@raven/db";
import { and, eq, lt } from "drizzle-orm";
import { subDays } from "date-fns";

export const cleanupRetention = async (db: Database) => {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, "analytics_retention_days"));

  const retentionDays = row ? Number.parseInt(row.value, 10) : 365;
  const cutoff = subDays(new Date(), retentionDays);

  const [requestResult] = await db
    .delete(requestLogs)
    .where(lt(requestLogs.createdAt, cutoff))
    .returning({ id: requestLogs.id });

  const [auditResult] = await db
    .delete(auditLogs)
    .where(lt(auditLogs.createdAt, cutoff))
    .returning({ id: auditLogs.id });

  console.log(
    `Retention cleanup: deleted request logs and audit logs older than ${retentionDays} days`
  );
};
```

- [ ] **Step 4: Update `admin/users.ts`**

Add user role management and deletion endpoints. Remove org count from the query:

```typescript
// Add these handler functions:
export const updateUserRole = (db: Database) => async (c: Context) => {
  const id = c.req.param("id");
  const { role } = await c.req.json<{ role: "admin" | "member" | "viewer" }>();
  // ... update user role, return success
};

export const deleteUser = (db: Database) => async (c: Context) => {
  const id = c.req.param("id");
  // ... soft delete user, return success
};
```

- [ ] **Step 5: Update `admin/stats.ts`**

Remove org count and plan distribution from stats. Update to remove any org references.

- [ ] **Step 6: Update `admin/index.ts`**

Wire up the new routes:

```typescript
import type { Database } from "@raven/db";
import { Hono } from "hono";
import type { Redis } from "ioredis";
import { syncModels } from "../cron/sync-models";
import { getAdminAuditLogs } from "./audit-logs";
import { getSettings, updateSettings } from "./settings";
import { getAdminStats } from "./stats";
import { getAdminProviders } from "./synced-providers";
import { deleteUser, getAdminUsers, updateUserRole } from "./users";

export const createAdminModule = (db: Database, redis: Redis) => {
  const app = new Hono();
  app.get("/stats", getAdminStats(db));
  app.get("/users", getAdminUsers(db));
  app.patch("/users/:id", updateUserRole(db));
  app.delete("/users/:id", deleteUser(db));
  app.get("/audit-logs", getAdminAuditLogs(db));
  app.get("/providers", getAdminProviders(db));
  app.post("/models/sync", syncModels(db, redis));
  app.get("/settings", getSettings(db));
  app.put("/settings", updateSettings(db));
  return app;
};
```

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/admin/
git commit -m "feat: add admin settings, user management, and retention cleanup"
```

---

### Task 11: Create Cron Entry Point

**Files:**
- Create: `apps/api/src/cron.ts`
- Modify: `apps/api/tsup.config.ts`

- [ ] **Step 1: Create `cron.ts`**

```typescript
import { createDb } from "@raven/db";
import { cleanupRetention } from "./modules/admin/retention";

// Import the model sync function
import { syncModelsJob } from "./modules/cron/sync-models";

const db = createDb();

console.log("Raven cron worker started");

// Model sync: run immediately, then every hour
const runModelSync = async () => {
  try {
    console.log(`[${new Date().toISOString()}] Running model sync...`);
    await syncModelsJob(db);
    console.log(`[${new Date().toISOString()}] Model sync complete`);
  } catch (err) {
    console.error("Model sync failed:", err);
  }
};

// Retention cleanup: run daily
const runRetentionCleanup = async () => {
  try {
    console.log(`[${new Date().toISOString()}] Running retention cleanup...`);
    await cleanupRetention(db);
    console.log(`[${new Date().toISOString()}] Retention cleanup complete`);
  } catch (err) {
    console.error("Retention cleanup failed:", err);
  }
};

await runModelSync();
setInterval(runModelSync, 60 * 60 * 1000); // 1 hour
setInterval(runRetentionCleanup, 24 * 60 * 60 * 1000); // 24 hours

// Keep process alive
process.on("SIGTERM", () => {
  console.log("Cron worker shutting down");
  process.exit(0);
});
```

Note: The exact import for syncModels depends on how `modules/cron/sync-models.ts` exports. It currently exports a Hono handler — you'll need to extract the core sync logic into a standalone function that the cron can call directly without an HTTP context.

- [ ] **Step 2: Update `tsup.config.ts`**

Add `cron.ts` as an additional entry point:

```typescript
import { defineConfig } from "tsup";

export default defineConfig({
  dts: true,
  entry: ["src/index.ts", "src/cron.ts"],
  format: ["esm"],
  noExternal: [
    "@raven/auth",
    "@raven/config",
    "@raven/db",
    "@raven/email",
    "@raven/types"
  ]
});
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/cron.ts apps/api/tsup.config.ts
git commit -m "feat: add cron entry point for model sync and retention cleanup"
```

---

### Task 12: Update API Entry Point (`index.ts`)

**Files:**
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: Rewrite `index.ts`**

Major changes:
1. Remove imports for: `createTenantMiddleware`, billing module, teams module, settings module, `createSettingsModule`
2. Remove the tenant middleware from the v1 route group
3. Remove billing webhook route (`POST /webhooks/billing`)
4. Remove cron route (`POST /v1/cron/sync-models`) — handled by cron container
5. Remove teams routes
6. Remove settings routes (org-scoped)
7. Remove billing routes
8. Add writer middleware to mutation routes
9. Add public settings route: `GET /v1/settings/public` → `getPublicSettings(db)`
10. Keep: auth routes, models (public), user module, admin module, all v1 feature modules, proxy/openai-compat
11. Update admin module import (it now includes settings routes)

The middleware stack becomes:
```
v1.use("*", authMiddleware)
v1.use("/admin/*", platformAdminMiddleware)
// Writer middleware applied per-route or as a group for mutation endpoints
```

- [ ] **Step 2: Verify all imports resolve**

Run: `cd /Users/yoginth/raven && pnpm --filter @raven/api typecheck`

Fix any remaining import errors.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/index.ts
git commit -m "feat: update API entry point - remove billing, teams, tenant middleware"
```

---

## Phase 3: Frontend

### Task 13: Delete Unused Frontend Pages & Components

**Files to delete (entire directories):**
- `apps/web/src/app/(dashboard)/billing/`
- `apps/web/src/app/(dashboard)/team/`
- `apps/web/src/app/(dashboard)/[slug]/`
- `apps/web/src/app/(dashboard)/components/org-switcher.tsx`
- `apps/web/src/app/(dashboard)/hooks/use-orgs.ts`
- `apps/web/src/stores/org.ts`
- `apps/web/src/app/onboarding/`
- `apps/web/src/app/(admin)/` (entire directory)
- `apps/web/src/app/(marketing)/pricing/`
- `apps/web/src/app/(marketing)/privacy/`
- `apps/web/src/app/(marketing)/terms/`
- `apps/web/src/app/(marketing)/docs/` (if exists)
- `apps/web/src/app/(marketing)/components/pricing-page.tsx`
- `apps/web/src/app/(marketing)/components/billing-toggle.tsx`
- `apps/web/src/app/(marketing)/components/home-page.tsx`
- `apps/web/src/app/(marketing)/components/hero-word-rotator.tsx`

- [ ] **Step 1: Delete all listed files and directories**

```bash
rm -rf apps/web/src/app/(dashboard)/billing/
rm -rf apps/web/src/app/(dashboard)/team/
rm -rf apps/web/src/app/(dashboard)/\[slug\]/
rm -f apps/web/src/app/(dashboard)/components/org-switcher.tsx
rm -f apps/web/src/app/(dashboard)/hooks/use-orgs.ts
rm -f apps/web/src/stores/org.ts
rm -rf apps/web/src/app/onboarding/
rm -rf apps/web/src/app/\(admin\)/
rm -rf apps/web/src/app/(marketing)/pricing/
rm -rf apps/web/src/app/(marketing)/privacy/
rm -rf apps/web/src/app/(marketing)/terms/
rm -rf apps/web/src/app/(marketing)/docs/
rm -f apps/web/src/app/(marketing)/components/pricing-page.tsx
rm -f apps/web/src/app/(marketing)/components/billing-toggle.tsx
rm -f apps/web/src/app/(marketing)/components/home-page.tsx
rm -f apps/web/src/app/(marketing)/components/hero-word-rotator.tsx
```

- [ ] **Step 2: Commit**

```bash
git add -A apps/web/
git commit -m "feat: delete billing, team, onboarding, admin layout, marketing pages"
```

---

### Task 14: Update Frontend Infrastructure — API Client, Middleware, Auth

**Files:**
- Modify: `apps/web/src/lib/api.ts`
- Modify: `apps/web/src/middleware.ts`
- Modify: `apps/web/src/lib/auth-client.ts`

- [ ] **Step 1: Update `api.ts` — remove X-Org-Id header**

Remove the `useOrgStore` import and the `X-Org-Id` header injection from the ky `beforeRequest` hook. The API client should just send authenticated requests without org context.

- [ ] **Step 2: Update `middleware.ts`**

Remove these protected route prefixes (pages no longer exist):
- `billing`
- `onboarding`
- `team`

Keep all other protected routes. Add `admin` if not already there.

- [ ] **Step 3: Update `auth-client.ts`**

Remove any organization-related exports if present. Keep signIn, signOut, signUp, useSession, forgetPassword, resetPassword.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/ apps/web/src/middleware.ts
git commit -m "feat: simplify frontend API client and route middleware"
```

---

### Task 15: Update Dashboard Layout & Sidebar

**Files:**
- Modify: `apps/web/src/app/(dashboard)/layout.tsx`
- Modify: `apps/web/src/app/(dashboard)/components/sidebar.tsx`
- Modify: `apps/web/src/app/(dashboard)/components/user-menu.tsx`

- [ ] **Step 1: Rewrite `layout.tsx`**

Remove:
- Org loading, org switching, org store usage
- Redirect to `/onboarding` if no orgs
- OrgSwitcher component

Simplify to:
- Check session (redirect to `/sign-in` if not authenticated)
- Render sidebar + main content
- No org context needed

- [ ] **Step 2: Rewrite `sidebar.tsx`**

Remove:
- Plan-based feature gating (`PLAN_FEATURES` filtering)
- OrgSwitcher at the top
- Team and Billing nav items

Add:
- "Admin" nav item at the bottom (only shown if `user.role === "admin"`)
- Shield icon for Admin item

All nav items always visible (no plan gating). The sidebar should have:
Overview, Playground, Analytics, Providers, Keys, Prompts, Models, Routing, Requests, Budgets, Guardrails, Webhooks, Audit Logs, Integrations, then a separator, then Admin (admin only).

- [ ] **Step 3: Update `user-menu.tsx`**

Remove the "Admin Panel" link (admin is now in the sidebar). Keep: Settings, Theme toggle, Sign out.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/(dashboard)/
git commit -m "feat: simplify dashboard layout - remove org switching, add admin to sidebar"
```

---

### Task 16: Create Admin Tabbed Page

**Files:**
- Create: `apps/web/src/app/(dashboard)/admin/page.tsx`
- Create: `apps/web/src/app/(dashboard)/admin/components/overview-tab.tsx`
- Create: `apps/web/src/app/(dashboard)/admin/components/users-tab.tsx`
- Create: `apps/web/src/app/(dashboard)/admin/components/models-tab.tsx`
- Create: `apps/web/src/app/(dashboard)/admin/components/audit-logs-tab.tsx`
- Create: `apps/web/src/app/(dashboard)/admin/components/settings-tab.tsx`
- Create: `apps/web/src/app/(dashboard)/admin/hooks/use-admin.ts`

- [ ] **Step 1: Create `hooks/use-admin.ts`**

Port and simplify the admin hooks from the old `(admin)/hooks/use-admin.ts`:
- `useAdminStats()` — fetch `/v1/admin/stats`
- `useAdminUsers()` — fetch `/v1/admin/users`
- `useAdminAuditLogs()` — fetch `/v1/admin/audit-logs`
- `useAdminProviders()` — fetch `/v1/admin/providers`
- `useAdminSettings()` — fetch `/v1/admin/settings`
- `useUpdateSettings()` — PUT `/v1/admin/settings`
- `useUpdateUserRole()` — PATCH `/v1/admin/users/:id`
- `useDeleteUser()` — DELETE `/v1/admin/users/:id`
- `useSyncModels()` — POST `/v1/admin/models/sync`

Remove: `useAdminOrgs()` (no orgs), org count from user interface.

- [ ] **Step 2: Create `overview-tab.tsx`**

Port from old `(admin)/admin/page.tsx`. Show stat cards (Total Users, Requests 30d, Cost 30d) and token usage breakdown. Remove plan distribution section.

- [ ] **Step 3: Create `users-tab.tsx`**

Port from old `(admin)/admin/users/page.tsx`. Add role dropdown per user row to change roles. Add delete user button. Remove org count column.

- [ ] **Step 4: Create `models-tab.tsx`**

Port from old `(admin)/admin/models/page.tsx`. Keep models grouped by provider and "Sync Now" button.

- [ ] **Step 5: Create `audit-logs-tab.tsx`**

Port from old `(admin)/admin/audit-logs/page.tsx`. Remove organization column.

- [ ] **Step 6: Create `settings-tab.tsx`**

New component with form fields:
- Instance name (text input)
- Analytics retention days (number input)
- Allow registration (toggle/switch)
- Save button that calls `useUpdateSettings()`

- [ ] **Step 7: Create `page.tsx`**

Main admin page with tab navigation:

```tsx
"use client";

import { useState } from "react";
import { redirect } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { OverviewTab } from "./components/overview-tab";
import { UsersTab } from "./components/users-tab";
import { ModelsTab } from "./components/models-tab";
import { AuditLogsTab } from "./components/audit-logs-tab";
import { SettingsTab } from "./components/settings-tab";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "users", label: "Users" },
  { id: "models", label: "Models" },
  { id: "audit-logs", label: "Audit Logs" },
  { id: "settings", label: "Settings" }
] as const;

export default function AdminPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<string>("overview");

  if (session?.user?.role !== "admin") {
    redirect("/overview");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <div className="flex gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={/* tab styling */}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === "overview" && <OverviewTab />}
      {activeTab === "users" && <UsersTab />}
      {activeTab === "models" && <ModelsTab />}
      {activeTab === "audit-logs" && <AuditLogsTab />}
      {activeTab === "settings" && <SettingsTab />}
    </div>
  );
}
```

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/app/(dashboard)/admin/
git commit -m "feat: add admin tabbed page with overview, users, models, logs, settings"
```

---

### Task 17: Simplify Profile & Settings Pages

**Files:**
- Modify: `apps/web/src/app/(dashboard)/profile/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/settings/page.tsx`

- [ ] **Step 1: Update `profile/page.tsx`**

Remove:
- PendingInvitations section
- OrgList section
- "Create Organization" button
- Any imports from deleted stores/hooks (useOrgStore, useOrgs)

Keep:
- ProfileForm (name, email)
- Danger Zone (delete account)

- [ ] **Step 2: Verify `settings/page.tsx`**

This currently re-exports profile/page.tsx. Keep this behavior — it's fine as an alias.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(dashboard)/profile/ apps/web/src/app/(dashboard)/settings/
git commit -m "feat: simplify profile page - remove org and invitation sections"
```

---

### Task 18: Rewrite Marketing Landing Page

**Files:**
- Modify: `apps/web/src/app/(marketing)/page.tsx`
- Modify: `apps/web/src/app/(marketing)/layout.tsx`

- [ ] **Step 1: Rewrite `layout.tsx`**

Simple layout with:
- Header: Logo + "Sign In" link (right-aligned)
- Main content area
- No footer (or minimal footer with GitHub link)

- [ ] **Step 2: Rewrite `page.tsx`**

Minimal open-source landing page:

```tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
        Raven
      </h1>
      <p className="mt-4 text-lg text-muted-foreground max-w-lg">
        Open-source AI model gateway. One API for every LLM provider.
      </p>
      <ul className="mt-8 space-y-2 text-left text-muted-foreground">
        <li>Unified API for OpenAI, Anthropic, Google, Mistral, and more</li>
        <li>Smart routing and load balancing across providers</li>
        <li>Cost tracking, budgets, and detailed analytics</li>
        <li>Content guardrails and safety controls</li>
        <li>Request logging and audit trails</li>
      </ul>
      <div className="mt-8 flex gap-4">
        <Link
          href="/sign-in"
          className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Get Started
        </Link>
        <a
          href="https://github.com/bigint/raven"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border px-6 py-3 text-sm font-medium hover:bg-accent"
        >
          View on GitHub
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(marketing)/
git commit -m "feat: rewrite landing page as minimal open-source project page"
```

---

## Phase 4: Docker & Cleanup

### Task 19: Create Docker Configuration

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `docker-entrypoint.sh`
- Create: `.dockerignore`

- [ ] **Step 1: Create `.dockerignore`**

```
node_modules
.next
dist
.git
.env
.env.local
apps/docs
*.md
!README.md
```

- [ ] **Step 2: Create `Dockerfile`**

Use the Dockerfile from the spec (Section 7). This is a multi-stage build:
1. deps stage: install pnpm dependencies
2. builder stage: build API and Web
3. runner stage: minimal production image

- [ ] **Step 3: Create `docker-entrypoint.sh`**

Use the entrypoint script from the spec (Section 7). Handles `serve` and `cron` modes.

- [ ] **Step 4: Create `docker-compose.yml`**

Use the docker-compose from the spec (Section 7) with 4 services: raven, raven-cron, postgres, redis.

- [ ] **Step 5: Commit**

```bash
git add Dockerfile docker-compose.yml docker-entrypoint.sh .dockerignore
git commit -m "feat: add Docker configuration for self-hosted deployment"
```

---

### Task 20: Final Cleanup & Verification

**Files:**
- Delete: `.github/workflows/sync-models.yml`
- Modify: `scripts/seed.ts`
- Verify: Full build passes

- [ ] **Step 1: Delete GitHub Actions cron workflow**

```bash
rm .github/workflows/sync-models.yml
```

- [ ] **Step 2: Update seed script**

Update `scripts/seed.ts` to:
- Remove organization creation
- Remove member creation
- Remove subscription creation
- Create users with the new role values (admin, member, viewer)
- First user should be admin
- Insert default settings rows

- [ ] **Step 3: Run full typecheck**

```bash
cd /Users/yoginth/raven && pnpm typecheck
```

Fix any remaining TypeScript errors across the entire monorepo. Common issues:
- Stale imports of deleted modules
- Type mismatches where `AppContext` was replaced with `AuthContext`
- Missing orgId in function signatures

- [ ] **Step 4: Run full build**

```bash
cd /Users/yoginth/raven && pnpm build
```

Fix any build errors.

- [ ] **Step 5: Run lint and format**

```bash
cd /Users/yoginth/raven && pnpm lint && pnpm format
```

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete open-source transformation - cleanup and verification"
```

---

## Task Dependency Graph

```
Task 1 (Schema) ──┬──→ Task 4 (Middleware) ──→ Task 5 (Delete modules)
Task 2 (Types)  ──┤                              │
Task 3 (Auth)   ──┘                              ├──→ Task 6 (Remove gates)
                                                 ├──→ Task 7 (Remove orgId)
                                                 ├──→ Task 8 (Core libs)
                                                 └──→ Task 9 (Analytics/Proxy)
                                                          │
                                                          ├──→ Task 10 (Admin API)
                                                          ├──→ Task 11 (Cron)
                                                          └──→ Task 12 (API index)
                                                                    │
Task 13 (Delete frontend) ──→ Task 14 (API client) ──→ Task 15 (Layout/Sidebar)
                                                          │
                                                          ├──→ Task 16 (Admin page)
                                                          ├──→ Task 17 (Profile)
                                                          └──→ Task 18 (Landing)
                                                                    │
                                                          Task 19 (Docker) ──→ Task 20 (Cleanup)
```

**Parallelizable groups:**
- Tasks 1, 2, 3 can run in parallel
- Tasks 6, 7, 8, 9 can run in parallel (after 5)
- Tasks 10, 11 can run in parallel (after 9)
- Tasks 13 can run independently
- Tasks 16, 17, 18 can run in parallel (after 15)
