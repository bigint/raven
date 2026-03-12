# Phase 1: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the new TypeScript-only monorepo, set up the database layer with Drizzle, and implement authentication with Better Auth — providing the foundation all subsequent phases build on.

**Architecture:** Modular monolith with pnpm workspaces. Single Next.js app (apps/web) for frontend, single Hono app (apps/api) for backend. Shared packages for DB, auth, config, types, UI, and email.

**Tech Stack:** TypeScript 5.8+, pnpm workspaces, Next.js 15, Hono, Drizzle ORM, PostgreSQL, Redis, Better Auth, Zod, Biome, Vitest, Tailwind CSS 4, Base UI

**Spec:** `docs/superpowers/specs/2026-03-12-saas-transformation-design.md`

---

## Chunk 1: Monorepo Scaffold

### Task 1: Clean up old code and set up workspace structure

This task removes all Go, Python, Go SDK, and old deployment code. It restructures the repo into the new `apps/` + `packages/` layout.

**Files:**
- Delete: `gateway/` (entire Go backend)
- Delete: `sdks/` (all SDKs)
- Delete: `deploy/` (Helm, systemd)
- Delete: `Makefile`
- Delete: `raven.yaml`
- Delete: `Dockerfile`
- Delete: `docker-compose.minimal.yml`
- Delete: `docker-compose.dev.yml`
- Delete: `dashboard/` (will be replaced by apps/web)
- Delete: `website/` (will be merged into apps/web)
- Delete: `scripts/` (build/dev/release scripts for old Go setup — obsolete)
- Modify: `pnpm-workspace.yaml`
- Modify: `package.json`
- Modify: `.gitignore`
- Create: `tsconfig.base.json`
- Create: `biome.json`
- Create: `docker-compose.yml` (replace existing)
- Create: `.env.example`

- [ ] **Step 1: Remove old directories and files**

```bash
rm -rf gateway sdks deploy dashboard website scripts
rm -f Makefile raven.yaml Dockerfile docker-compose.minimal.yml docker-compose.dev.yml
```

- [ ] **Step 2: Create new directory structure**

```bash
mkdir -p apps/web apps/api
mkdir -p packages/db packages/auth packages/email packages/ui packages/types packages/config
```

- [ ] **Step 3: Update pnpm-workspace.yaml**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [ ] **Step 4: Update root package.json**

```json
{
  "name": "raven",
  "private": true,
  "packageManager": "pnpm@10.27.0",
  "type": "module",
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "build": "pnpm -r build",
    "lint": "biome check --write .",
    "format": "biome format --write .",
    "test": "pnpm -r test",
    "typecheck": "pnpm -r typecheck",
    "dev:web": "pnpm --filter @raven/web dev",
    "dev:api": "pnpm --filter @raven/api dev",
    "db:generate": "pnpm --filter @raven/db generate",
    "db:migrate": "pnpm --filter @raven/db migrate",
    "db:studio": "pnpm --filter @raven/db studio"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.4",
    "typescript": "^5.8.3"
  },
  "pnpm": {
    "onlyBuiltDependencies": [
      "@biomejs/biome",
      "esbuild",
      "sharp"
    ]
  }
}
```

- [ ] **Step 5: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "skipLibCheck": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 6: Create root biome.json**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "asNeeded"
    }
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedImports": "warn",
        "noUnusedVariables": "warn"
      },
      "suspicious": {
        "noExplicitAny": "error"
      },
      "a11y": {
        "useButtonType": "error",
        "useKeyWithClickEvents": "error"
      }
    }
  },
  "files": {
    "ignore": ["dist/", "node_modules/", ".next/", "drizzle/"]
  }
}
```

- [ ] **Step 7: Update .gitignore**

```gitignore
# Dependencies
node_modules/
.pnpm-store/

# Build output
dist/
.next/
out/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Database
*.db
*.db-wal
*.db-shm

# Test coverage
coverage/

# Logs
*.log

# Drizzle
drizzle/

# Superpowers
.superpowers/
```

- [ ] **Step 8: Create docker-compose.yml for local dev**

```yaml
services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: raven
      POSTGRES_PASSWORD: raven
      POSTGRES_DB: raven
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U raven']
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

- [ ] **Step 9: Create .env.example**

```bash
# Database
DATABASE_URL=postgresql://raven:raven@localhost:5432/raven

# Redis
REDIS_URL=redis://localhost:6379

# Auth
BETTER_AUTH_SECRET=your-secret-here-change-in-production
BETTER_AUTH_URL=http://localhost:3001
APP_URL=http://localhost:3000

# Social Auth (optional)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Paddle
PADDLE_API_KEY=
PADDLE_WEBHOOK_SECRET=

# Resend
RESEND_API_KEY=

# Encryption (for provider API keys at rest)
ENCRYPTION_SECRET=your-32-byte-hex-secret-change-in-production

# App
NEXT_PUBLIC_API_URL=http://localhost:3001
API_PORT=3001
```

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold monorepo structure for SaaS transformation"
```

---

### Task 2: Set up packages/config (shared env validation)

**Files:**
- Create: `packages/config/package.json`
- Create: `packages/config/tsconfig.json`
- Create: `packages/config/src/env.ts`
- Create: `packages/config/src/index.ts`

- [ ] **Step 1: Create packages/config/package.json**

```json
{
  "name": "@raven/config",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    }
  },
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "typescript": "^5.8.3"
  }
}
```

- [ ] **Step 2: Create packages/config/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create packages/config/src/env.ts**

```typescript
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(16),
  BETTER_AUTH_URL: z.string().url(),
  APP_URL: z.string().url(),
  PADDLE_API_KEY: z.string().optional(),
  PADDLE_WEBHOOK_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  ENCRYPTION_SECRET: z.string().min(32),
  ENCRYPTION_SECRET_PREVIOUS: z.string().min(32).optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  NEXT_PUBLIC_API_URL: z.string().url(),
  API_PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

export type Env = z.infer<typeof envSchema>

export const parseEnv = (source: Record<string, string | undefined> = process.env): Env => {
  const result = envSchema.safeParse(source)
  if (!result.success) {
    const formatted = result.error.flatten().fieldErrors
    const missing = Object.entries(formatted)
      .map(([key, errors]) => `  ${key}: ${errors?.join(', ')}`)
      .join('\n')
    throw new Error(`Invalid environment variables:\n${missing}`)
  }
  return result.data
}
```

- [ ] **Step 4: Create packages/config/src/index.ts**

```typescript
export { parseEnv, type Env } from './env.js'
```

- [ ] **Step 5: Commit**

```bash
git add packages/config/
git commit -m "feat: add shared config package with Zod env validation"
```

---

### Task 3: Set up packages/types (shared TypeScript types)

**Files:**
- Create: `packages/types/package.json`
- Create: `packages/types/tsconfig.json`
- Create: `packages/types/src/api.ts`
- Create: `packages/types/src/providers.ts`
- Create: `packages/types/src/billing.ts`
- Create: `packages/types/src/index.ts`

- [ ] **Step 1: Create packages/types/package.json**

```json
{
  "name": "@raven/types",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    }
  },
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.8.3"
  }
}
```

- [ ] **Step 2: Create packages/types/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create packages/types/src/billing.ts**

```typescript
export type Plan = 'free' | 'pro' | 'team' | 'enterprise'

export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'trialing'

export interface PlanFeatures {
  readonly maxSeats: number
  readonly maxRequestsPerMonth: number
  readonly maxProviders: number
  readonly maxBudgets: number
  readonly maxVirtualKeys: number
  readonly analyticsRetentionDays: number
  readonly hasTeams: boolean
  readonly hasSSO: boolean
  readonly hasAuditLogs: boolean
  readonly hasGuardrails: boolean
}

export type BooleanFeatureKey = {
  [K in keyof PlanFeatures]: PlanFeatures[K] extends boolean ? K : never
}[keyof PlanFeatures]

export type NumericFeatureKey = {
  [K in keyof PlanFeatures]: PlanFeatures[K] extends number ? K : never
}[keyof PlanFeatures]

export const PLAN_FEATURES: Record<Plan, PlanFeatures> = {
  free: {
    maxSeats: 1,
    maxRequestsPerMonth: 10_000,
    maxProviders: 2,
    maxBudgets: 1,
    maxVirtualKeys: 3,
    analyticsRetentionDays: 7,
    hasTeams: false,
    hasSSO: false,
    hasAuditLogs: false,
    hasGuardrails: false,
  },
  pro: {
    maxSeats: 1,
    maxRequestsPerMonth: 500_000,
    maxProviders: Infinity,
    maxBudgets: 10,
    maxVirtualKeys: 20,
    analyticsRetentionDays: 30,
    hasTeams: false,
    hasSSO: false,
    hasAuditLogs: false,
    hasGuardrails: true,
  },
  team: {
    maxSeats: 20,
    maxRequestsPerMonth: 2_000_000,
    maxProviders: Infinity,
    maxBudgets: Infinity,
    maxVirtualKeys: Infinity,
    analyticsRetentionDays: 90,
    hasTeams: true,
    hasSSO: false,
    hasAuditLogs: false,
    hasGuardrails: true,
  },
  enterprise: {
    maxSeats: Infinity,
    maxRequestsPerMonth: Infinity,
    maxProviders: Infinity,
    maxBudgets: Infinity,
    maxVirtualKeys: Infinity,
    analyticsRetentionDays: 365,
    hasTeams: true,
    hasSSO: true,
    hasAuditLogs: true,
    hasGuardrails: true,
  },
} as const
```

- [ ] **Step 4: Create packages/types/src/providers.ts**

```typescript
export type Provider = 'openai' | 'anthropic' | 'google'

export interface ModelInfo {
  readonly id: string
  readonly name: string
  readonly provider: Provider
  readonly inputPricePer1m: number
  readonly outputPricePer1m: number
  readonly contextWindow: number
  readonly supportsStreaming: boolean
}

export interface TokenCount {
  readonly inputTokens: number
  readonly outputTokens: number
  readonly cachedTokens: number
}
```

- [ ] **Step 5: Create packages/types/src/api.ts**

```typescript
export type OrgRole = 'owner' | 'admin' | 'member' | 'viewer'
export type TeamRole = 'lead' | 'member'
export type PlatformRole = 'user' | 'admin'
export type KeyEnvironment = 'live' | 'test'
export type BudgetEntityType = 'organization' | 'team' | 'key'
export type BudgetPeriod = 'daily' | 'monthly'
export type GuardrailType = 'block_topics' | 'pii_detection' | 'content_filter' | 'custom_regex'
export type GuardrailAction = 'block' | 'warn' | 'log'
export type SsoProvider = 'saml' | 'oidc'

export interface ApiError {
  readonly code: string
  readonly message: string
  readonly details?: Record<string, unknown>
}

export interface PaginatedResponse<T> {
  readonly data: readonly T[]
  readonly total: number
  readonly page: number
  readonly pageSize: number
  readonly hasMore: boolean
}
```

- [ ] **Step 6: Create packages/types/src/index.ts**

```typescript
export * from './api.js'
export * from './billing.js'
export * from './providers.js'
```

- [ ] **Step 7: Commit**

```bash
git add packages/types/
git commit -m "feat: add shared types package with billing, provider, and API types"
```

---

### Task 4: Set up packages/db (Drizzle schema + migrations)

**Files:**
- Create: `packages/db/package.json`
- Create: `packages/db/tsconfig.json`
- Create: `packages/db/drizzle.config.ts`
- Create: `packages/db/src/client.ts`
- Create: `packages/db/src/schema/organizations.ts`
- Create: `packages/db/src/schema/users.ts`
- Create: `packages/db/src/schema/members.ts`
- Create: `packages/db/src/schema/teams.ts`
- Create: `packages/db/src/schema/providers.ts`
- Create: `packages/db/src/schema/keys.ts`
- Create: `packages/db/src/schema/request-logs.ts`
- Create: `packages/db/src/schema/budgets.ts`
- Create: `packages/db/src/schema/subscriptions.ts`
- Create: `packages/db/src/schema/invitations.ts`
- Create: `packages/db/src/schema/audit-logs.ts`
- Create: `packages/db/src/schema/guardrail-rules.ts`
- Create: `packages/db/src/schema/sso-configs.ts`
- Create: `packages/db/src/schema/index.ts`
- Create: `packages/db/src/helpers.ts`
- Create: `packages/db/src/index.ts`

- [ ] **Step 1: Create packages/db/package.json**

```json
{
  "name": "@raven/db",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    }
  },
  "scripts": {
    "generate": "drizzle-kit generate",
    "migrate": "drizzle-kit migrate",
    "studio": "drizzle-kit studio",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "drizzle-orm": "^0.44.0",
    "postgres": "^3.4.7",
    "@paralleldrive/cuid2": "^2.2.2"
  },
  "devDependencies": {
    "drizzle-kit": "^0.31.0",
    "typescript": "^5.8.3"
  }
}
```

- [ ] **Step 2: Create packages/db/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true
  },
  "include": ["src", "drizzle.config.ts"]
}
```

- [ ] **Step 3: Create packages/db/drizzle.config.ts**

```typescript
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
```

- [ ] **Step 4: Create packages/db/src/schema/organizations.ts**

```typescript
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'

export const organizations = pgTable('organizations', {
  id: text('id').primaryKey().$defaultFn(createId),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  paddleCustomerId: text('paddle_customer_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
```

- [ ] **Step 5: Create packages/db/src/schema/users.ts**

```typescript
import { boolean, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'

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
```

- [ ] **Step 6: Create packages/db/src/schema/members.ts**

```typescript
import { pgEnum, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'
import { organizations } from './organizations.js'
import { users } from './users.js'

export const orgRoleEnum = pgEnum('org_role', ['owner', 'admin', 'member', 'viewer'])

export const members = pgTable('members', {
  id: text('id').primaryKey().$defaultFn(createId),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: orgRoleEnum('role').notNull().default('member'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique('members_org_user_unique').on(t.organizationId, t.userId),
])
```

- [ ] **Step 7: Create packages/db/src/schema/teams.ts**

```typescript
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
```

- [ ] **Step 8: Create packages/db/src/schema/providers.ts**

```typescript
import { boolean, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'
import { organizations } from './organizations.js'

export const providerConfigs = pgTable('provider_configs', {
  id: text('id').primaryKey().$defaultFn(createId),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  apiKey: text('api_key').notNull(),
  isEnabled: boolean('is_enabled').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique('provider_configs_org_provider_unique').on(t.organizationId, t.provider),
])
```

- [ ] **Step 9: Create packages/db/src/schema/keys.ts**

```typescript
import { boolean, integer, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'
import { organizations } from './organizations.js'
import { teams } from './teams.js'

export const keyEnvironmentEnum = pgEnum('key_environment', ['live', 'test'])

export const virtualKeys = pgTable('virtual_keys', {
  id: text('id').primaryKey().$defaultFn(createId),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  teamId: text('team_id').references(() => teams.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  keyHash: text('key_hash').notNull().unique(),
  keyPrefix: text('key_prefix').notNull(),
  environment: keyEnvironmentEnum('environment').notNull().default('live'),
  rateLimitRpm: integer('rate_limit_rpm'),
  rateLimitRpd: integer('rate_limit_rpd'),
  isActive: boolean('is_active').notNull().default(true),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
})
```

- [ ] **Step 10: Create packages/db/src/schema/request-logs.ts**

```typescript
import { boolean, integer, numeric, pgTable, text, timestamp, index } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'
import { organizations } from './organizations.js'
import { virtualKeys } from './keys.js'

export const requestLogs = pgTable('request_logs', {
  id: text('id').primaryKey().$defaultFn(createId),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  virtualKeyId: text('virtual_key_id').notNull().references(() => virtualKeys.id, { onDelete: 'cascade' }),
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
}, (t) => [
  index('request_logs_org_created_idx').on(t.organizationId, t.createdAt),
])
```

- [ ] **Step 11: Create packages/db/src/schema/budgets.ts**

```typescript
import { numeric, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'
import { organizations } from './organizations.js'

export const budgetEntityTypeEnum = pgEnum('budget_entity_type', ['organization', 'team', 'key'])
export const budgetPeriodEnum = pgEnum('budget_period', ['daily', 'monthly'])

export const budgets = pgTable('budgets', {
  id: text('id').primaryKey().$defaultFn(createId),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  entityType: budgetEntityTypeEnum('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  limitAmount: numeric('limit_amount', { precision: 12, scale: 2 }).notNull(),
  period: budgetPeriodEnum('period').notNull().default('monthly'),
  alertThreshold: numeric('alert_threshold', { precision: 3, scale: 2 }).notNull().default('0.80'),
  periodStart: timestamp('period_start', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
```

- [ ] **Step 12: Create packages/db/src/schema/subscriptions.ts**

```typescript
import { integer, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'
import { organizations } from './organizations.js'

export const planEnum = pgEnum('plan', ['free', 'pro', 'team', 'enterprise'])
export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'past_due', 'cancelled', 'trialing'])

export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey().$defaultFn(createId),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  paddleSubscriptionId: text('paddle_subscription_id').notNull().unique(),
  plan: planEnum('plan').notNull().default('free'),
  status: subscriptionStatusEnum('status').notNull().default('active'),
  seats: integer('seats').notNull().default(1),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
```

- [ ] **Step 13: Create packages/db/src/schema/invitations.ts**

```typescript
import { pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'
import { organizations } from './organizations.js'
import { orgRoleEnum } from './members.js'

export const invitations = pgTable('invitations', {
  id: text('id').primaryKey().$defaultFn(createId),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: orgRoleEnum('role').notNull().default('member'),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique('invitations_org_email_unique').on(t.organizationId, t.email),
])
```

- [ ] **Step 14: Create packages/db/src/schema/audit-logs.ts**

```typescript
import { jsonb, pgTable, text, timestamp, index } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'
import { organizations } from './organizations.js'
import { users } from './users.js'

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey().$defaultFn(createId),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  actorId: text('actor_id').notNull().references(() => users.id),
  action: text('action').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('audit_logs_org_created_idx').on(t.organizationId, t.createdAt),
])
```

- [ ] **Step 15: Create packages/db/src/schema/guardrail-rules.ts**

```typescript
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
```

- [ ] **Step 16: Create packages/db/src/schema/sso-configs.ts**

```typescript
import { boolean, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'
import { organizations } from './organizations.js'

export const ssoProviderEnum = pgEnum('sso_provider', ['saml', 'oidc'])

export const ssoConfigs = pgTable('sso_configs', {
  id: text('id').primaryKey().$defaultFn(createId),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }).unique(),
  provider: ssoProviderEnum('provider').notNull(),
  issuerUrl: text('issuer_url').notNull(),
  ssoUrl: text('sso_url').notNull(),
  certificate: text('certificate').notNull(),
  isEnabled: boolean('is_enabled').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
```

- [ ] **Step 17: Create packages/db/src/schema/index.ts**

```typescript
export { organizations } from './organizations.js'
export { users, platformRoleEnum } from './users.js'
export { members, orgRoleEnum } from './members.js'
export { teams, teamMembers, teamRoleEnum } from './teams.js'
export { providerConfigs } from './providers.js'
export { virtualKeys, keyEnvironmentEnum } from './keys.js'
export { requestLogs } from './request-logs.js'
export { budgets, budgetEntityTypeEnum, budgetPeriodEnum } from './budgets.js'
export { subscriptions, planEnum, subscriptionStatusEnum } from './subscriptions.js'
export { invitations } from './invitations.js'
export { auditLogs } from './audit-logs.js'
export { guardrailRules, guardrailTypeEnum, guardrailActionEnum } from './guardrail-rules.js'
export { ssoConfigs, ssoProviderEnum } from './sso-configs.js'
```

- [ ] **Step 18: Create packages/db/src/helpers.ts**

```typescript
import { eq } from 'drizzle-orm'
import type { PgTable } from 'drizzle-orm/pg-core'
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
```

- [ ] **Step 19: Create packages/db/src/client.ts**

```typescript
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema/index.js'

export const createDatabase = (url: string) => {
  const client = postgres(url, { max: 20, idle_timeout: 30 })
  return drizzle(client, { schema })
}
```

- [ ] **Step 20: Create packages/db/src/index.ts**

```typescript
export * from './schema/index.js'
export { createDatabase } from './client.js'
export { createTenantQueries, insertWithTenant, type Database, type TenantQueries } from './helpers.js'
```

- [ ] **Step 21: Install dependencies and generate initial migration**

```bash
pnpm install
docker compose up -d
pnpm db:generate
```

Expected: Drizzle generates migration files in `packages/db/drizzle/`

- [ ] **Step 22: Run migration**

```bash
pnpm db:migrate
```

Expected: All tables created in PostgreSQL

- [ ] **Step 23: Commit**

```bash
git add packages/db/
git commit -m "feat: add database package with Drizzle schema and migrations"
```

---

## Chunk 2: Hono API Scaffold + Auth System

### Task 5: Set up apps/api (Hono backend)

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/src/index.ts`
- Create: `apps/api/src/lib/redis.ts`
- Create: `apps/api/src/lib/errors.ts`

- [ ] **Step 1: Create apps/api/package.json**

```json
{
  "name": "@raven/api",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsup src/index.ts --format esm --dts",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "hono": "^4.7.0",
    "@hono/node-server": "^1.14.0",
    "@hono/zod-validator": "^0.5.0",
    "@raven/db": "workspace:*",
    "@raven/config": "workspace:*",
    "@raven/types": "workspace:*",
    "ioredis": "^5.6.0",
    "zod": "^3.25.0",
    "pino": "^9.6.0",
    "better-auth": "^1.2.0"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "tsup": "^8.5.0",
    "typescript": "^5.8.3",
    "vitest": "^3.2.0",
    "@types/node": "^22.15.0"
  }
}
```

- [ ] **Step 2: Create apps/api/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create apps/api/src/lib/redis.ts**

```typescript
import Redis from 'ioredis'

let redis: Redis | null = null

export const getRedis = (url: string): Redis => {
  if (!redis) {
    redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    })
  }
  return redis
}
```

- [ ] **Step 4: Create apps/api/src/lib/errors.ts**

```typescript
export class AppError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly code: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found', details?: Record<string, unknown>) {
    super(message, 404, 'NOT_FOUND', details)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', details?: Record<string, unknown>) {
    super(message, 401, 'UNAUTHORIZED', details)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details?: Record<string, unknown>) {
    super(message, 403, 'FORBIDDEN', details)
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: Record<string, unknown>) {
    super(message, 400, 'VALIDATION_ERROR', details)
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', details?: Record<string, unknown>) {
    super(message, 409, 'CONFLICT', details)
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests', details?: Record<string, unknown>) {
    super(message, 429, 'RATE_LIMITED', details)
  }
}
```

- [ ] **Step 5: Create apps/api/src/index.ts**

```typescript
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { parseEnv } from '@raven/config'
import { createDatabase } from '@raven/db'
import { getRedis } from './lib/redis.js'
import { AppError } from './lib/errors.js'

const env = parseEnv()
const db = createDatabase(env.DATABASE_URL)
const redis = getRedis(env.REDIS_URL)

const app = new Hono()

// Global middleware
app.use('*', logger())
app.use('*', cors({
  origin: env.BETTER_AUTH_URL,
  credentials: true,
}))

// Global error handler
app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json({
      code: err.code,
      message: err.message,
      details: err.details,
    }, err.statusCode as 400)
  }
  console.error('Unhandled error:', err)
  return c.json({ code: 'INTERNAL_ERROR', message: 'Internal server error' }, 500)
})

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }))

serve({ fetch: app.fetch, port: env.API_PORT }, (info) => {
  console.log(`Raven API running on http://localhost:${info.port}`)
})

export default app
```

- [ ] **Step 6: Install deps and verify it starts**

```bash
pnpm install
pnpm dev:api
```

Expected: `Raven API running on http://localhost:3001`

- [ ] **Step 7: Commit**

```bash
git add apps/api/
git commit -m "feat: add Hono API scaffold with health check, Redis, and error handling"
```

---

### Task 6: Set up packages/auth (Better Auth)

**Files:**
- Create: `packages/auth/package.json`
- Create: `packages/auth/tsconfig.json`
- Create: `packages/auth/src/server.ts`
- Create: `packages/auth/src/client.ts`
- Create: `packages/auth/src/index.ts`

- [ ] **Step 1: Create packages/auth/package.json**

```json
{
  "name": "@raven/auth",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    },
    "./client": {
      "types": "./src/client.ts",
      "default": "./src/client.ts"
    }
  },
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "better-auth": "^1.2.0",
    "@raven/db": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.8.3"
  }
}
```

- [ ] **Step 2: Create packages/auth/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create packages/auth/src/server.ts**

Note: Better Auth's exact API may vary by version. Check docs at https://www.better-auth.com before implementing. This is the target configuration.

**Important:** Better Auth manages its own `user`, `session`, `account`, and `verification` tables via the Drizzle adapter. The custom `users` table in `packages/db/src/schema/users.ts` defines the *target* columns. At implementation time, use Better Auth's `user.additionalFields` to add `role` and `avatarUrl` columns to Better Auth's managed user table, rather than creating a competing table. If Better Auth's schema approach has changed, consult the latest docs for the correct way to extend the user model.

```typescript
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { organization } from 'better-auth/plugins'
import type { Database } from '@raven/db'
import type { Env } from '@raven/config'

export const createAuth = (db: Database, env: Env) => {
  return betterAuth({
    database: drizzleAdapter(db, { provider: 'pg' }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [env.APP_URL],
    emailAndPassword: {
      enabled: true,
    },
    user: {
      additionalFields: {
        role: { type: 'string', defaultValue: 'user' },
        avatarUrl: { type: 'string', required: false },
      },
    },
    socialProviders: {
      ...(env.GITHUB_CLIENT_ID ? {
        github: {
          clientId: env.GITHUB_CLIENT_ID,
          clientSecret: env.GITHUB_CLIENT_SECRET!,
        },
      } : {}),
      ...(env.GOOGLE_CLIENT_ID ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET!,
        },
      } : {}),
    },
    session: {
      expiresIn: 30 * 24 * 60 * 60, // 30 days
      updateAge: 24 * 60 * 60, // 1 day
    },
    plugins: [
      organization({
        roles: ['owner', 'admin', 'member', 'viewer'],
      }),
    ],
  })
}

export type Auth = ReturnType<typeof createAuth>
```

- [ ] **Step 4: Create packages/auth/src/client.ts**

```typescript
import { createAuthClient } from 'better-auth/react'
import { organizationClient } from 'better-auth/client/plugins'

export const createBetterAuthClient = (baseURL: string) => {
  return createAuthClient({
    baseURL,
    plugins: [organizationClient()],
  })
}

export type AuthClient = ReturnType<typeof createBetterAuthClient>
```

- [ ] **Step 5: Create packages/auth/src/index.ts**

```typescript
export { createAuth, type Auth } from './server.js'
```

- [ ] **Step 6: Commit**

```bash
git add packages/auth/
git commit -m "feat: add Better Auth package with org support"
```

---

### Task 7: Mount auth on API + add auth middleware

**Files:**
- Create: `apps/api/src/modules/auth/index.ts`
- Create: `apps/api/src/middleware/auth.ts`
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: Create apps/api/src/modules/auth/index.ts**

```typescript
import { Hono } from 'hono'
import type { Auth } from '@raven/auth'

export const createAuthModule = (auth: Auth) => {
  const app = new Hono()

  app.all('/*', (c) => {
    return auth.handler(c.req.raw)
  })

  return app
}
```

- [ ] **Step 2: Create apps/api/src/middleware/auth.ts**

```typescript
import { createMiddleware } from 'hono/factory'
import type { Auth } from '@raven/auth'

type AuthContext = {
  Variables: {
    user: {
      id: string
      email: string
      name: string
      role: string
    }
    session: {
      id: string
      userId: string
    }
  }
}

export const createAuthMiddleware = (auth: Auth) => {
  return createMiddleware<AuthContext>(async (c, next) => {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    })

    if (!session) {
      return c.json({ code: 'UNAUTHORIZED', message: 'Not authenticated' }, 401)
    }

    c.set('user', session.user)
    c.set('session', session.session)
    await next()
  })
}
```

- [ ] **Step 3: Update apps/api/src/index.ts to mount auth**

Update the file to import and mount auth:

```typescript
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { parseEnv } from '@raven/config'
import { createDatabase } from '@raven/db'
import { createAuth } from '@raven/auth'
import { getRedis } from './lib/redis.js'
import { AppError } from './lib/errors.js'
import { createAuthModule } from './modules/auth/index.js'

const env = parseEnv()
const db = createDatabase(env.DATABASE_URL)
const redis = getRedis(env.REDIS_URL)
const auth = createAuth(db, env)

const app = new Hono()

// Global middleware
app.use('*', logger())
app.use('*', cors({
  origin: [env.APP_URL],
  credentials: true,
}))

// Global error handler
app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json({
      code: err.code,
      message: err.message,
      details: err.details,
    }, err.statusCode as 400)
  }
  console.error('Unhandled error:', err)
  return c.json({ code: 'INTERNAL_ERROR', message: 'Internal server error' }, 500)
})

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }))

// Auth routes (public)
app.route('/auth', createAuthModule(auth))

serve({ fetch: app.fetch, port: env.API_PORT }, (info) => {
  console.log(`Raven API running on http://localhost:${info.port}`)
})

export { auth }
export default app
```

- [ ] **Step 4: Verify auth endpoints work**

```bash
pnpm dev:api
# In another terminal:
curl http://localhost:3001/auth/ok
```

Expected: Better Auth responds (exact response depends on version)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/
git commit -m "feat: mount Better Auth on API with session middleware"
```

---

### Task 8: Set up apps/web (Next.js frontend scaffold)

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/postcss.config.mjs`
- Create: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/(marketing)/page.tsx`
- Create: `apps/web/src/app/(auth)/sign-in/page.tsx`
- Create: `apps/web/src/app/(auth)/sign-up/page.tsx`
- Create: `apps/web/src/app/(dashboard)/layout.tsx`
- Create: `apps/web/src/app/(dashboard)/overview/page.tsx`
- Create: `apps/web/src/lib/auth-client.ts`
- Create: `apps/web/src/lib/api.ts`

- [ ] **Step 1: Create apps/web/package.json**

```json
{
  "name": "@raven/web",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev --port 3000",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "lint": "biome check --write src/"
  },
  "dependencies": {
    "next": "^15.3.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "@tanstack/react-query": "^5.75.7",
    "better-auth": "^1.2.0",
    "@raven/auth": "workspace:*",
    "@raven/types": "workspace:*",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.3.0",
    "lucide-react": "^0.513.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.1.7",
    "tailwindcss": "^4.1.7",
    "@types/react": "^19.1.4",
    "@types/react-dom": "^19.1.5",
    "typescript": "^5.8.3"
  }
}
```

- [ ] **Step 2: Create apps/web/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true,
    "jsx": "preserve",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src", "next-env.d.ts", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create apps/web/next.config.ts**

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@raven/types'],
}

export default nextConfig
```

- [ ] **Step 4: Create apps/web/postcss.config.mjs**

```javascript
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

- [ ] **Step 5: Create apps/web/tailwind.config.ts**

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
}

export default config
```

- [ ] **Step 6: Create apps/web/src/app/globals.css**

```css
@import 'tailwindcss';
```

- [ ] **Step 7: Create apps/web/src/lib/auth-client.ts**

Uses `@raven/auth/client` rather than duplicating the Better Auth client setup.

```typescript
import { createBetterAuthClient } from '@raven/auth/client'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export const authClient = createBetterAuthClient(API_URL)

export const {
  useSession,
  signIn,
  signUp,
  signOut,
  useActiveOrganization,
  useListOrganizations,
} = authClient
```

- [ ] **Step 8: Create apps/web/src/lib/api.ts**

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export const api = {
  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      credentials: 'include',
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Request failed' }))
      throw new Error(error.message)
    }
    return res.json()
  },

  async post<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Request failed' }))
      throw new Error(error.message)
    }
    return res.json()
  },

  async put<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Request failed' }))
      throw new Error(error.message)
    }
    return res.json()
  },

  async delete<T>(path: string): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Request failed' }))
      throw new Error(error.message)
    }
    return res.json()
  },
}
```

- [ ] **Step 9: Create apps/web/src/app/layout.tsx**

```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Raven - AI Gateway',
  description: 'Unified AI gateway for teams',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 10: Create apps/web/src/app/(marketing)/page.tsx**

```tsx
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold">Raven</h1>
      <p className="mt-4 text-lg text-gray-600">Unified AI Gateway for Teams</p>
    </main>
  )
}
```

- [ ] **Step 11: Create apps/web/src/app/(auth)/sign-in/page.tsx**

```tsx
'use client'

import { useState } from 'react'
import { signIn } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await signIn.email({ email, password })
      router.push('/overview')
    } catch {
      setError('Invalid email or password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Sign In</h1>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div>
          <label htmlFor="email" className="block text-sm font-medium">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 block w-full rounded border px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 block w-full rounded border px-3 py-2"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </main>
  )
}
```

- [ ] **Step 12: Create apps/web/src/app/(auth)/sign-up/page.tsx**

```tsx
'use client'

import { useState } from 'react'
import { signUp } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'

export default function SignUpPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await signUp.email({ name, email, password })
      router.push('/overview')
    } catch {
      setError('Failed to create account')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Create Account</h1>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div>
          <label htmlFor="name" className="block text-sm font-medium">Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 block w-full rounded border px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 block w-full rounded border px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="mt-1 block w-full rounded border px-3 py-2"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {isLoading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>
    </main>
  )
}
```

- [ ] **Step 13: Create apps/web/src/app/(dashboard)/layout.tsx**

```tsx
'use client'

import { useSession } from '@/lib/auth-client'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const NAV_ITEMS = [
  { href: '/overview', label: 'Overview' },
  { href: '/providers', label: 'Providers' },
  { href: '/keys', label: 'Keys' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/requests', label: 'Requests' },
  { href: '/budgets', label: 'Budgets' },
  { href: '/settings', label: 'Settings' },
] as const

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession()

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (!session) {
    redirect('/sign-in')
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r bg-gray-50 p-4">
        <div className="mb-6 text-lg font-bold">Raven</div>
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
```

- [ ] **Step 14: Create apps/web/src/app/(dashboard)/overview/page.tsx**

```tsx
'use client'

import { useSession } from '@/lib/auth-client'

export default function OverviewPage() {
  const { data: session } = useSession()

  return (
    <div>
      <h1 className="text-2xl font-bold">Overview</h1>
      <p className="mt-2 text-gray-600">
        Welcome{session?.user?.name ? `, ${session.user.name}` : ''}
      </p>
    </div>
  )
}
```

- [ ] **Step 15: Install dependencies and verify**

```bash
pnpm install
pnpm dev:web
```

Expected: Next.js starts on port 3000, landing page renders

- [ ] **Step 16: Commit**

```bash
git add apps/web/
git commit -m "feat: add Next.js frontend with auth pages and dashboard shell"
```

---

### Task 9: Set up remaining stub packages (email, ui)

**Files:**
- Create: `packages/email/package.json`
- Create: `packages/email/tsconfig.json`
- Create: `packages/email/src/send.ts`
- Create: `packages/email/src/index.ts`
- Create: `packages/ui/package.json`
- Create: `packages/ui/tsconfig.json`
- Create: `packages/ui/src/cn.ts`
- Create: `packages/ui/src/index.ts`

- [ ] **Step 1: Create packages/email/package.json**

```json
{
  "name": "@raven/email",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    }
  },
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "resend": "^4.5.0",
    "react": "^19.1.0",
    "@react-email/components": "^0.0.36"
  },
  "devDependencies": {
    "typescript": "^5.8.3"
  }
}
```

- [ ] **Step 2: Create packages/email/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create packages/email/src/send.ts**

```typescript
import { Resend } from 'resend'

let resend: Resend | null = null

const getResend = () => {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) throw new Error('RESEND_API_KEY is not set')
    resend = new Resend(apiKey)
  }
  return resend
}

export const sendEmail = async (options: {
  to: string
  subject: string
  html: string
}): Promise<void> => {
  const client = getResend()
  await client.emails.send({
    from: 'Raven <noreply@raven.dev>',
    to: options.to,
    subject: options.subject,
    html: options.html,
  })
}
```

- [ ] **Step 4: Create packages/email/src/index.ts**

```typescript
export { sendEmail } from './send.js'
```

- [ ] **Step 5: Create packages/ui/package.json**

```json
{
  "name": "@raven/ui",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    }
  },
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^19.1.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.3.0",
    "class-variance-authority": "^0.7.1"
  },
  "devDependencies": {
    "typescript": "^5.8.3",
    "@types/react": "^19.1.4"
  }
}
```

- [ ] **Step 6: Create packages/ui/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true,
    "jsx": "react-jsx",
    "lib": ["ES2023", "DOM", "DOM.Iterable"]
  },
  "include": ["src"]
}
```

- [ ] **Step 7: Create packages/ui/src/cn.ts**

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))
```

- [ ] **Step 8: Create packages/ui/src/index.ts**

```typescript
export { cn } from './cn.js'
```

- [ ] **Step 9: Install all dependencies**

```bash
pnpm install
```

- [ ] **Step 10: Commit**

```bash
git add packages/email/ packages/ui/
git commit -m "feat: add email and UI stub packages"
```

---

### Task 10: Final integration test and pnpm install

- [ ] **Step 1: Run pnpm install from root**

```bash
pnpm install
```

- [ ] **Step 2: Start docker dependencies**

```bash
docker compose up -d
```

- [ ] **Step 3: Run database migration**

```bash
pnpm db:generate
pnpm db:migrate
```

Expected: All tables created successfully

- [ ] **Step 4: Start both dev servers**

```bash
pnpm dev
```

Expected: API on :3001, Next.js on :3000, both start without errors

- [ ] **Step 5: Verify health check**

```bash
curl http://localhost:3001/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 6: Verify Next.js landing page**

Open http://localhost:3000 in browser. Expected: "Raven - Unified AI Gateway for Teams" heading.

- [ ] **Step 7: Final commit for any remaining changes**

```bash
git add -A
git commit -m "chore: finalize Phase 1 foundation setup"
```

---

## Summary

Phase 1 produces:

- **Monorepo structure** with `apps/web`, `apps/api`, and 6 packages (`db`, `auth`, `config`, `types`, `email`, `ui`)
- **PostgreSQL database** with all 13 tables defined in Drizzle schema + migrations
- **Hono API** with health check, error handling, CORS, Redis client, and Better Auth mounted
- **Next.js frontend** with marketing landing page, sign-in/sign-up pages, and authenticated dashboard shell
- **Shared packages** for config (Zod env validation), types (billing, providers, API), auth (Better Auth server + client), email (Resend stub), and UI (cn utility)
- **Docker Compose** for local PostgreSQL + Redis

Next: Phase 2 (Core Product) — proxy engine, virtual keys, rate limiting, and caching.
