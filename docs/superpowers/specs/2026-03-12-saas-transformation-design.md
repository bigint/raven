# Raven SaaS Transformation — Design Specification

## Overview

Transform Raven from a self-hosted open-source AI gateway into a hosted multi-tenant SaaS platform. Users sign up, bring their own AI provider keys, and route API calls through Raven's cloud. Raven manages routing, analytics, budgets, caching, and team collaboration. Revenue model is seat-based with feature gating across Free, Pro, Team, and Enterprise tiers.

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Architecture | Modular monolith | Right for team size (8-10), simple ops, clean boundaries for future extraction |
| Language | TypeScript only | Remove Go backend, Python/Go SDKs. Single language across entire stack |
| Backend | Hono | Lightweight, fast, edge-ready. Ideal for proxy workloads |
| Frontend | Next.js 15 (single app) | Dashboard + marketing in one app via route groups |
| Auth | Better Auth | Open-source, self-hosted, native org/team support, no vendor lock-in |
| ORM | Drizzle | Lightweight, SQL-like, great TypeScript inference. Pairs well with Hono |
| Database | PostgreSQL | Production-grade, proven at scale |
| Cache/Queue | Redis | Shared state for rate limiting, caching, pub/sub across instances |
| Payments | Paddle | Merchant of Record, handles tax/compliance |
| Email | Resend + React Email | Modern DX, component-based templates |
| Monorepo | pnpm workspaces | Simple, no extra tooling overhead |
| Deployment | Railway/Render | Simple PaaS, fast to ship |
| Billing model | Seat-based + feature gating | Fixed monthly per seat, features unlocked by plan tier |

### What Gets Removed

- Go backend (`gateway/`)
- Python SDK (`sdks/python/`)
- Go SDK (`sdks/go/`)
- TypeScript SDK (`sdks/typescript/`)
- Helm charts (`deploy/helm/`)
- systemd service (`deploy/systemd/`)
- Makefile (replaced by pnpm scripts)
- Current dashboard (Vite SPA — rewritten as Next.js routes)
- Current website (separate Next.js app — merged into single app)

---

## 1. Monorepo Structure

```
raven/
├── apps/
│   ├── web/                        # Next.js 15 (marketing + dashboard)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (marketing)/    # Public pages (landing, pricing, blog, docs, changelog)
│   │   │   │   ├── (dashboard)/    # Authenticated dashboard
│   │   │   │   │   ├── layout.tsx  # Dashboard shell (sidebar, nav, org switcher)
│   │   │   │   │   ├── overview/
│   │   │   │   │   ├── providers/
│   │   │   │   │   ├── keys/
│   │   │   │   │   ├── analytics/
│   │   │   │   │   ├── requests/
│   │   │   │   │   ├── budgets/
│   │   │   │   │   ├── cache/
│   │   │   │   │   ├── models/
│   │   │   │   │   ├── guardrails/
│   │   │   │   │   ├── team/
│   │   │   │   │   ├── billing/
│   │   │   │   │   └── settings/
│   │   │   │   ├── (auth)/         # Sign-in, sign-up, verify
│   │   │   │   ├── admin/          # Internal admin panel
│   │   │   │   └── api/            # Next.js API routes (auth callbacks, webhooks)
│   │   │   ├── components/         # Shared UI components
│   │   │   ├── hooks/              # Custom hooks
│   │   │   └── lib/                # Utilities, API client, constants
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   │
│   └── api/                        # Hono backend
│       ├── src/
│       │   ├── index.ts            # Entry point, mount all modules
│       │   ├── modules/
│       │   │   ├── auth/           # Better Auth setup + handlers
│       │   │   ├── proxy/          # AI proxy engine (core product)
│       │   │   │   ├── handler.ts  # Request proxy + SSE streaming
│       │   │   │   ├── providers/  # Provider adapters
│       │   │   │   │   ├── openai.ts
│       │   │   │   │   ├── anthropic.ts
│       │   │   │   │   └── registry.ts
│       │   │   │   ├── router.ts   # Routing strategies (fallback, round-robin, cost-based)
│       │   │   │   └── cache.ts    # Redis response caching
│       │   │   ├── keys/           # Virtual key management
│       │   │   ├── budgets/        # Budget tracking + enforcement
│       │   │   ├── analytics/      # Usage analytics + cost calculation
│       │   │   ├── billing/        # Paddle integration + webhooks
│       │   │   ├── teams/          # Org + team + member management
│       │   │   ├── admin/          # Internal admin endpoints
│       │   │   ├── guardrails/     # Content safety rules
│       │   │   └── notifications/  # Email triggers (Resend)
│       │   ├── middleware/
│       │   │   ├── auth.ts         # Session + API key auth
│       │   │   ├── rate-limit.ts   # Redis sliding window
│       │   │   ├── tenant.ts       # Multi-tenancy context (resolves orgId)
│       │   │   └── logger.ts       # Structured logging (pino)
│       │   └── lib/
│       │       ├── redis.ts        # Redis client
│       │       ├── errors.ts       # Custom error classes
│       │       ├── crypto.ts       # Encryption helpers (AES-256-GCM)
│       │       └── validate.ts     # Zod + Hono zValidator helpers
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── db/                         # Drizzle schema + migrations
│   │   ├── src/
│   │   │   ├── schema/
│   │   │   │   ├── organizations.ts
│   │   │   │   ├── users.ts
│   │   │   │   ├── members.ts
│   │   │   │   ├── teams.ts
│   │   │   │   ├── providers.ts
│   │   │   │   ├── keys.ts
│   │   │   │   ├── request-logs.ts
│   │   │   │   ├── budgets.ts
│   │   │   │   ├── subscriptions.ts
│   │   │   │   ├── invitations.ts
│   │   │   │   ├── audit-logs.ts
│   │   │   │   ├── guardrail-rules.ts
│   │   │   │   ├── sso-configs.ts
│   │   │   │   └── index.ts
│   │   │   ├── helpers.ts          # Tenant-scoped query helpers
│   │   │   ├── migrations/
│   │   │   └── client.ts           # Drizzle client factory
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   │
│   ├── auth/                       # Better Auth shared config
│   │   └── src/
│   │       ├── server.ts           # Server-side auth (used by api + web API routes)
│   │       └── client.ts           # Client-side auth (used by web)
│   │
│   ├── email/                      # React Email templates + Resend
│   │   └── src/
│   │       ├── templates/
│   │       │   ├── welcome.tsx
│   │       │   ├── team-invite.tsx
│   │       │   ├── budget-alert.tsx
│   │       │   └── billing-receipt.tsx
│   │       └── send.ts             # Resend send wrapper
│   │
│   ├── ui/                         # Shared React components
│   │   └── src/
│   │       ├── button.tsx
│   │       ├── input.tsx
│   │       ├── modal.tsx
│   │       ├── table.tsx
│   │       ├── chart.tsx
│   │       └── index.ts
│   │
│   ├── types/                      # Shared TypeScript types
│   │   └── src/
│   │       ├── api.ts              # API request/response types
│   │       ├── providers.ts        # Provider types
│   │       ├── billing.ts          # Plan/subscription types
│   │       └── index.ts
│   │
│   └── config/                     # Shared env/config validation
│       └── src/
│           └── env.ts              # Zod schemas for env vars
│
├── pnpm-workspace.yaml
├── package.json                    # Root scripts
├── tsconfig.base.json              # Shared TypeScript config
├── biome.json                      # Biome config
├── .env.example
├── docker-compose.yml              # Local dev (PostgreSQL + Redis)
├── Dockerfile                      # Multi-stage production build
├── CLAUDE.md
└── STYLEGUIDE.md                   # Updated for new stack
```

---

## 2. Database Schema

All tenant-scoped tables include `organizationId` foreign key. Queries are scoped via Drizzle helper functions that enforce tenant isolation.

### Tables

#### organizations
| Column | Type | Notes |
|--------|------|-------|
| id | text (cuid2) | PK |
| name | text | |
| slug | text | UNIQUE, URL-safe |
| paddleCustomerId | text? | |
| createdAt | timestamp | |
| updatedAt | timestamp | |

**Note:** `plan` is derived from the active subscription record (`subscriptions` table is the source of truth). If no active subscription exists, org defaults to `free`. Helper: `getOrgPlan(orgId)` queries `subscriptions` table.

#### users
| Column | Type | Notes |
|--------|------|-------|
| id | text (cuid2) | PK |
| email | text | UNIQUE |
| name | text | |
| avatarUrl | text? | |
| role | enum | user, admin (platform-level) |
| emailVerified | boolean | |
| createdAt | timestamp | |
| updatedAt | timestamp | |

#### members (org membership)
| Column | Type | Notes |
|--------|------|-------|
| id | text (cuid2) | PK |
| organizationId | text | FK → organizations |
| userId | text | FK → users |
| role | enum | owner, admin, member, viewer |
| createdAt | timestamp | |

UNIQUE(organizationId, userId)

#### teams
| Column | Type | Notes |
|--------|------|-------|
| id | text (cuid2) | PK |
| organizationId | text | FK → organizations |
| name | text | |
| createdAt | timestamp | |

#### team_members
| Column | Type | Notes |
|--------|------|-------|
| id | text (cuid2) | PK |
| teamId | text | FK → teams |
| userId | text | FK → users |
| role | enum | lead, member |
| createdAt | timestamp | |

UNIQUE(teamId, userId)

#### provider_configs
| Column | Type | Notes |
|--------|------|-------|
| id | text (cuid2) | PK |
| organizationId | text | FK → organizations |
| provider | text | openai, anthropic, google, etc. |
| apiKey | text | Encrypted (AES-256-GCM) |
| isEnabled | boolean | |
| createdAt | timestamp | |
| updatedAt | timestamp | |

UNIQUE(organizationId, provider)

#### virtual_keys
| Column | Type | Notes |
|--------|------|-------|
| id | text (cuid2) | PK |
| organizationId | text | FK → organizations |
| teamId | text? | FK → teams (optional scoping) |
| name | text | Human-readable label |
| keyHash | text | SHA-256 hash, UNIQUE |
| keyPrefix | text | rk_live_* or rk_test_* (first 12 chars) |
| environment | enum | live, test |
| rateLimitRpm | integer? | Requests per minute |
| rateLimitRpd | integer? | Requests per day |
| isActive | boolean | |
| expiresAt | timestamp? | |
| createdAt | timestamp | |
| lastUsedAt | timestamp? | |

#### request_logs
| Column | Type | Notes |
|--------|------|-------|
| id | text (cuid2) | PK |
| organizationId | text | FK → organizations |
| virtualKeyId | text | FK → virtual_keys |
| provider | text | |
| model | text | |
| method | text | HTTP method |
| path | text | Request path |
| statusCode | integer | |
| inputTokens | integer | |
| outputTokens | integer | |
| cachedTokens | integer | |
| cost | numeric(12,6) | USD cost |
| latencyMs | integer | |
| cacheHit | boolean | |
| createdAt | timestamp | Indexed for time-range queries |

Highest-volume table. Index on (organizationId, createdAt). At scale: partition by month, archive old data to cold storage.

**Data Retention:** A daily cron job deletes request_logs older than the org's plan retention limit (7/30/90/365 days). Runs during off-peak hours. Deletes in batches of 10,000 to avoid long-running transactions.

#### budgets
| Column | Type | Notes |
|--------|------|-------|
| id | text (cuid2) | PK |
| organizationId | text | FK → organizations |
| entityType | enum | organization, team, key |
| entityId | text | References org/team/key id |
| limitAmount | numeric(12,2) | USD |
| period | enum | daily, monthly |
| alertThreshold | numeric(3,2) | Default 0.80 |
| periodStart | timestamp | Reset point |
| createdAt | timestamp | |

**Real-time spend tracking:** `currentSpend` is tracked in Redis (`budget:spend:{budgetId}` with atomic INCRBYFLOAT), not in this table. A periodic sync job (every 5 minutes) writes the Redis value back to PostgreSQL for durability. Budget checks in the proxy flow read from Redis for speed. Redis key TTL matches the budget period. This avoids row-level lock contention on high-traffic orgs.

#### subscriptions
| Column | Type | Notes |
|--------|------|-------|
| id | text (cuid2) | PK |
| organizationId | text | FK → organizations |
| paddleSubscriptionId | text | UNIQUE |
| plan | enum | free, pro, team, enterprise |
| status | enum | active, past_due, cancelled, trialing |
| seats | integer | |
| currentPeriodStart | timestamp | |
| currentPeriodEnd | timestamp | |
| createdAt | timestamp | |
| updatedAt | timestamp | |

#### invitations
| Column | Type | Notes |
|--------|------|-------|
| id | text (cuid2) | PK |
| organizationId | text | FK → organizations |
| email | text | |
| role | enum | admin, member, viewer |
| token | text | UNIQUE, secure random |
| expiresAt | timestamp | |
| acceptedAt | timestamp? | |
| createdAt | timestamp | |

UNIQUE(organizationId, email) — prevents duplicate invitations to the same email.

**Invitation edge cases:**
- Accepting an expired invitation: rejected with error, user prompted to request new invite
- Accepting when org is at seat limit: rejected with error, admin notified
- Duplicate invite to same email: updates existing pending invitation (new token, reset expiry)

#### audit_logs (Enterprise only)
| Column | Type | Notes |
|--------|------|-------|
| id | text (cuid2) | PK |
| organizationId | text | FK → organizations |
| actorId | text | FK → users |
| action | text | e.g., key.created, member.invited, provider.updated |
| resourceType | text | e.g., virtual_key, member, provider_config |
| resourceId | text | ID of affected resource |
| metadata | jsonb | Additional context (old/new values, IP, user agent) |
| createdAt | timestamp | Indexed |

Audit events are written asynchronously (fire-and-forget to avoid proxy latency). Retention: 1 year. Actions logged: all CRUD on keys, providers, members, teams, budgets, billing, org settings.

#### guardrail_rules
| Column | Type | Notes |
|--------|------|-------|
| id | text (cuid2) | PK |
| organizationId | text | FK → organizations |
| name | text | Human-readable label |
| type | enum | block_topics, pii_detection, content_filter, custom_regex |
| config | jsonb | Rule-specific configuration |
| action | enum | block, warn, log |
| isEnabled | boolean | |
| priority | integer | Evaluation order (lower = first) |
| createdAt | timestamp | |
| updatedAt | timestamp | |

Guardrails are evaluated in the proxy flow between budget check and provider forward. Rules are evaluated in priority order. On `block`: request rejected with 400. On `warn`: request proceeds, logged with warning. On `log`: request proceeds, logged silently.

#### sso_configs (Enterprise only)
| Column | Type | Notes |
|--------|------|-------|
| id | text (cuid2) | PK |
| organizationId | text | FK → organizations, UNIQUE |
| provider | enum | saml, oidc |
| issuerUrl | text | IdP issuer URL |
| ssoUrl | text | SSO endpoint |
| certificate | text | IdP X.509 certificate (encrypted) |
| isEnabled | boolean | |
| createdAt | timestamp | |
| updatedAt | timestamp | |

SSO uses Better Auth's enterprise SSO plugin. When enabled for an org, email/password login is disabled for that org's domain.

### Tenant Isolation Pattern

Rather than a magic wrapper, tenant isolation uses explicit Drizzle query patterns:

```typescript
// packages/db/src/helpers.ts

// Helper that creates pre-filtered query builders for a specific org
export const createTenantQueries = (db: DrizzleClient, orgId: string) => ({
  keys: () => db.select().from(virtualKeys).where(eq(virtualKeys.organizationId, orgId)),
  providers: () => db.select().from(providerConfigs).where(eq(providerConfigs.organizationId, orgId)),
  logs: () => db.select().from(requestLogs).where(eq(requestLogs.organizationId, orgId)),
  // ... one per tenant-scoped table
})

// For inserts, helper ensures orgId is always set
export const insertWithTenant = <T extends TenantTable>(
  db: DrizzleClient,
  table: T,
  orgId: string,
  values: Omit<InferInsert<T>, 'organizationId'>
) => db.insert(table).values({ ...values, organizationId: orgId })
```

For joins and aggregations, the `organizationId` filter is applied explicitly at the query level. No magic — every tenant-scoped query has a visible `WHERE organizationId = ?`. Admin/system queries bypass this by using `db` directly (restricted to admin module only).

**Input Validation:** All API request bodies are validated with Zod schemas before reaching business logic. Each module defines its own schemas (e.g., `createKeySchema`, `updateBudgetSchema`). Hono's `zValidator` middleware is used for automatic validation and typed request bodies.

---

## 3. Backend Architecture

### Hono Module System

Each module exports a Hono app that gets mounted on the main router:

```typescript
// apps/api/src/index.ts
const app = new Hono()

// Middleware stack (order matters)
app.use('*', loggerMiddleware())
app.use('*', corsMiddleware())
app.use('/v1/*', rateLimitMiddleware())
app.use('/v1/*', authMiddleware())        // Session or API key auth
app.use('/v1/*', csrfMiddleware())        // CSRF protection for session-based requests
app.use('/v1/*', tenantMiddleware())

// Admin routes: session auth + platform admin role required
app.use('/admin/*', authMiddleware())
app.use('/admin/*', requirePlatformAdmin())

// Mount modules
app.route('/v1/proxy', proxyModule)
app.route('/v1/keys', keysModule)
app.route('/v1/budgets', budgetsModule)
app.route('/v1/analytics', analyticsModule)
app.route('/v1/teams', teamsModule)
app.route('/v1/providers', providersModule)
app.route('/v1/billing', billingModule)     // Webhook endpoint skips auth (uses Paddle signature verification)
app.route('/admin', adminModule)
app.route('/auth', authModule)
```

### Proxy Flow

```
Client Request (with rk_live_* key)
  │
  ├─ 1. Auth Middleware: validate virtual key (SHA-256 hash lookup)
  ├─ 2. Rate Limit: check Redis sliding window (per-key RPM/RPD)
  ├─ 3. Tenant: resolve org from key, inject context
  ├─ 4. Budget Check: atomic Redis INCRBYFLOAT on budget counter, reject if would exceed limit
  ├─ 5. Guardrails: evaluate rules in priority order (if enabled) — block/warn/log based on rule config
  ├─ 6. Route: select provider + model based on routing strategy
  │     ├─ Fallback: primary → secondary provider
  │     ├─ Round-robin: distribute across providers
  │     ├─ Cost-based: cheapest provider for the model
  │     └─ Rules-based: custom routing rules
  ├─ 7. Cache Check: SHA-256 content hash → Redis lookup
  │     ├─ HIT: return cached response, log as cache hit
  │     └─ MISS: continue to provider
  ├─ 8. Forward: proxy request to selected provider
  │     ├─ Non-streaming: forward, await response, return
  │     └─ Streaming: SSE passthrough with token counting
  ├─ 9. Log: write to request_logs (async, non-blocking)
  └─ 10. Request Counter: increment monthly request count in Redis (for plan limit enforcement)
```

### Provider Adapter Pattern

Each provider implements a common interface:

```typescript
interface ProviderAdapter {
  readonly name: string
  readonly models: readonly ModelInfo[]
  transformRequest(req: ProxyRequest): ProviderRequest
  transformResponse(res: ProviderResponse): ProxyResponse
  countTokens(req: ProxyRequest, res: ProxyResponse): TokenCount
  streamResponse(res: ReadableStream): ReadableStream
}
```

### Rate Limiting

Redis sliding window algorithm:

```
Key: ratelimit:{virtualKeyId}:{window}
TTL: window duration
Value: request count
```

Two levels:
- Per virtual key: RPM and RPD (configurable per key)
- Per IP: global rate limit for unauthenticated endpoints

### Caching

Redis-based with content-addressable keys:

```
Key: cache:{orgId}:{sha256(provider + model + messages + temperature + top_p + max_tokens + other_params)}
TTL: configurable (default 1 hour)
Value: compressed response body
```

Cache is opt-in per virtual key. Cache invalidation on provider config change.

---

## 4. Frontend Architecture

### Next.js App Router

**Route Groups:**
- `(marketing)` — SSR/SSG public pages, SEO optimized
- `(auth)` — Better Auth pages (sign-in, sign-up, verify email)
- `(dashboard)` — Authenticated app, client components + TanStack Query

### Dashboard Data Fetching

All dashboard data fetching uses TanStack Query hitting the Hono API:

```typescript
// Example: keys page
const getKeysQueryOptions = (orgId: string) =>
  queryOptions({
    queryKey: ['keys', { orgId }],
    queryFn: () => api.get<VirtualKey[]>(`/v1/keys`),
  })
```

API client is a thin fetch wrapper that:
- Attaches session cookie (for dashboard) or API key header (for programmatic access)
- Handles error responses with typed error classes
- Supports request/response interceptors

### Dashboard Pages

| Route | Purpose |
|-------|---------|
| `/overview` | Key metrics, recent activity, quick actions |
| `/providers` | Configure AI provider API keys |
| `/keys` | Create/manage virtual API keys |
| `/analytics` | Usage charts, cost breakdown, model usage |
| `/requests` | Request log table with filters |
| `/budgets` | Budget configuration and spend tracking |
| `/cache` | Cache settings and hit rate stats |
| `/models` | Available models across providers |
| `/guardrails` | Content safety rules |
| `/team` | Team members, invitations, roles |
| `/billing` | Subscription, plan, invoices (Paddle portal) |
| `/settings` | Org settings, danger zone |

### UI Component Library

Built on Base UI primitives + Tailwind CSS 4:

```
packages/ui/src/
  ├── button.tsx      # CVA variants (default, outline, ghost, destructive)
  ├── input.tsx       # Text input with label, error, description
  ├── modal.tsx       # Base UI Dialog wrapper
  ├── table.tsx       # Data table with sorting, filtering, pagination
  ├── chart.tsx       # Recharts wrapper components
  ├── select.tsx      # Base UI Select wrapper
  ├── tabs.tsx        # Base UI Tabs wrapper
  ├── badge.tsx       # Status badges
  ├── card.tsx        # Content cards
  ├── dropdown.tsx    # Base UI Menu wrapper
  ├── toast.tsx       # Notification toasts
  └── index.ts        # Barrel export
```

All components follow STYLEGUIDE.md patterns:
- Arrow function components
- Props interfaces with readonly
- CVA for variants
- `cn()` for class merging
- Keyboard accessible
- ARIA attributes

---

## 5. Authentication & Authorization

### Better Auth Setup

```typescript
// packages/auth/src/server.ts
export const auth = betterAuth({
  database: drizzleAdapter(db),
  emailAndPassword: { enabled: true },
  socialProviders: {
    github: { ... },
    google: { ... },
  },
  organization: {
    enabled: true,  // Built-in org support
    roles: ['owner', 'admin', 'member', 'viewer'],
  },
  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
})
```

### Authorization Model

**Platform roles:** `user` | `admin` (system-wide)
**Organization roles:** `owner` | `admin` | `member` | `viewer`
**Team roles:** `lead` | `member`

Permission matrix:

| Action | Owner | Admin | Member | Viewer |
|--------|-------|-------|--------|--------|
| View dashboard | yes | yes | yes | yes |
| Manage keys | yes | yes | yes | no |
| Manage providers | yes | yes | no | no |
| Manage team | yes | yes | no | no |
| Manage billing | yes | no | no | no |
| Delete org | yes | no | no | no |

### API Key Auth (Proxy)

Virtual keys authenticate proxy requests:

```
Authorization: Bearer rk_live_xxxxxxxxxxxx
```

1. Extract key from header
2. SHA-256 hash the key
3. Lookup hash in `virtual_keys` table
4. Validate: isActive, not expired, org plan active
5. Inject org context into request

---

## 6. Billing & Subscriptions

### Paddle Integration

**Webhook-driven architecture:**

All Paddle webhooks are verified using `PADDLE_WEBHOOK_SECRET` signature validation before processing. Invalid signatures are rejected with 400.

```
User action → Paddle Checkout → Paddle webhooks → Hono /v1/billing/webhook
  │
  ├─ subscription.created → Create subscription record (org plan derived from this)
  ├─ subscription.updated → Update seats, plan changes
  ├─ subscription.cancelled → Mark cancelled, downgrade at currentPeriodEnd
  ├─ subscription.past_due → Send alert email, 7-day grace period before downgrade
  └─ transaction.completed → Log payment
```

**Cancellation behavior:**
- Subscription remains active until `currentPeriodEnd` (Paddle handles this)
- At period end, subscription status becomes `cancelled`
- Org automatically downgrades to Free tier
- Resources exceeding Free limits (e.g., 15 virtual keys when Free allows 3) are **soft-disabled** (not deleted). They become read-only — existing keys stop working but data is preserved. User can re-enable by upgrading.

**Request limit enforcement:**
- Monthly request count tracked in Redis (`requests:count:{orgId}:{YYYY-MM}`)
- When limit reached, proxy returns `429 Too Many Requests` with `Retry-After` header and upgrade prompt
- Limit resets at the start of each billing period

### Pricing Tiers

| Feature | Free | Pro ($29/mo) | Team ($49/seat/mo) | Enterprise (custom) |
|---------|------|-------|------|------------|
| Seats | 1 | 1 (single-user) | Up to 20 | Unlimited |
| Requests/month | 10,000 | 500,000 | 2,000,000 | Unlimited |
| Providers | 2 | All | All | All + custom |
| Analytics retention | 7 days | 30 days | 90 days | 1 year |
| Caching | Basic (1h TTL) | Advanced (custom TTL) | Advanced | Advanced |
| Rate limiting | Fixed (60 RPM) | Configurable | Configurable | Custom |
| Budgets | 1 | 10 | Unlimited | Unlimited |
| Virtual keys | 3 | 20 | Unlimited | Unlimited |
| Teams | No | No | Yes | Yes |
| SSO/SAML | No | No | No | Yes |
| Audit logs | No | No | No | Yes |
| Guardrails | No | Basic | Advanced | Custom |
| Support | Community | Email | Priority email | Dedicated |
| SLA | None | None | 99.9% | 99.99% |

### Feature Gating

```typescript
// Feature registry — boolean flags for feature access, numeric for quotas
interface PlanFeatures {
  readonly maxSeats: number          // Infinity for unlimited
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

const PLAN_FEATURES: Record<Plan, PlanFeatures> = {
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
  // ... pro, team, enterprise
}

// Boolean feature gate — checks has* flags
const requireFeature = (feature: BooleanFeatureKey) =>
  async (c: Context, next: Next) => {
    const plan = await getOrgPlan(c.get('orgId'))
    if (!PLAN_FEATURES[plan][feature]) {
      throw new ForbiddenError('Upgrade required', { feature, currentPlan: plan })
    }
    await next()
  }

// Numeric quota gate — checks current count against max* limits
const requireQuota = (quota: NumericFeatureKey, getCurrentCount: (orgId: string) => Promise<number>) =>
  async (c: Context, next: Next) => {
    const plan = await getOrgPlan(c.get('orgId'))
    const limit = PLAN_FEATURES[plan][quota]
    const current = await getCurrentCount(c.get('orgId'))
    if (current >= limit) {
      throw new ForbiddenError('Quota exceeded', { quota, current, limit, currentPlan: plan })
    }
    await next()
  }
```

---

## 7. Multi-Tenancy & Security

### Tenant Isolation

- All tenant-scoped database queries go through `withTenant()` helper
- Middleware injects `organizationId` into Hono context
- No raw SQL queries without tenant scope (enforced by code review)
- Virtual keys are scoped to organizations; cross-org access is impossible

### CSRF Protection

Dashboard uses cookie-based session auth to a separate API origin. CSRF protection is required:
- All state-changing requests (POST/PUT/DELETE) from the dashboard include a CSRF token in the `X-CSRF-Token` header
- Token is generated per session and stored in a secure, HTTPOnly cookie
- API middleware validates the token on all mutating requests for session-authenticated users
- API key-authenticated requests (proxy) are exempt (no cookies involved)

### Encryption

- **Provider API keys**: AES-256-GCM at rest
  - Encryption key derived from `ENCRYPTION_SECRET` env var via HKDF
  - Each encrypted value has unique IV and a `keyVersion` field (integer)
  - Decrypted only at proxy time, never returned to clients
  - **Key rotation:** When `ENCRYPTION_SECRET` changes, set `ENCRYPTION_SECRET_PREVIOUS` alongside it. A background job re-encrypts all provider keys with the new secret. Both secrets are accepted during migration. Once migration completes, remove the old secret.
- **Virtual keys**: SHA-256 hash stored, plaintext shown once at creation
- **Sessions**: HTTPOnly, Secure, SameSite=Strict cookies

### Security Headers

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Content-Security-Policy: default-src 'self'
```

### Provider Key Health Checks

When the proxy receives an auth error (401/403) from a provider, it:
1. Marks the provider config as `isEnabled: false`
2. Sends an email notification to org admins
3. Subsequent proxy requests to that provider return a clear error: "Provider API key is invalid. Please update your key in Settings > Providers."
4. Admin can re-enable after updating the key (key is validated before saving)

### Multi-Org Session Management

- Active organization is stored in the session record (`activeOrgId`)
- Dashboard includes an org switcher component
- On org switch, session's `activeOrgId` is updated via API call
- If a user is removed from an org while it's their active org, the tenant middleware detects the stale membership and switches them to their next available org (or shows "no org" state)
- API client sends `X-Org-Id` header; middleware validates the user is a member of that org

### Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| Auth (login/register) | 10 req | per minute per IP |
| Dashboard API | 100 req | per minute per session |
| Proxy (Free) | 60 req | per minute per key |
| Proxy (Pro/Team) | Configurable | per key |
| Webhooks | 1000 req | per minute per IP |

---

## 8. Email System

### Templates (React Email)

| Template | Trigger | Content |
|----------|---------|---------|
| Welcome | User registration | Getting started guide, link to dashboard |
| Team Invite | Admin invites member | Org name, role, accept link (expires 7 days) |
| Budget Alert | Spend hits threshold | Current spend, limit, % used, link to budgets |
| Billing Receipt | Payment processed | Amount, plan, period, Paddle receipt link |
| Plan Downgrade | Subscription cancelled | What changes, when, how to resubscribe |

### Resend Integration

```typescript
// packages/email/src/send.ts
export async function sendEmail<T extends TemplateName>(
  template: T,
  props: TemplateProps[T],
  to: string
): Promise<void>
```

---

## 9. Infrastructure & Deployment

### Services

| Service | Platform | Purpose |
|---------|----------|---------|
| web | Railway/Render | Next.js frontend |
| api | Railway/Render | Hono backend (Node.js) |
| PostgreSQL | Railway/Render managed | Primary database |
| Redis | Railway/Render managed | Cache, rate limiting, sessions |

### Environment Variables

```
# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://...

# Auth
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=...

# Paddle
PADDLE_API_KEY=...
PADDLE_WEBHOOK_SECRET=...

# Resend
RESEND_API_KEY=...

# Encryption
ENCRYPTION_SECRET=...   # For provider API key encryption

# App
NEXT_PUBLIC_API_URL=...
NODE_ENV=production
```

### Local Development

```bash
# Start dependencies
docker compose up -d  # PostgreSQL + Redis

# Install and run
pnpm install
pnpm db:migrate       # Run Drizzle migrations
pnpm dev              # Runs web + api concurrently
```

### Connection Pooling

PostgreSQL connections are managed via Drizzle's built-in pool (based on `node-postgres`). Configuration:
- `max`: 20 connections per API instance
- `idleTimeoutMillis`: 30000
- Railway/Render managed PostgreSQL supports up to 100 concurrent connections. With horizontal scaling, use a connection pooler (PgBouncer or Railway's built-in pooler) when running more than 4 API instances.

### Scaling Path

1. **Launch**: 1 web instance + 1 api instance
2. **Growth**: Horizontal scale api instances (stateless, Redis for shared state)
3. **Scale**: Add connection pooler, extract proxy to separate service if proxy traffic dominates
4. **Enterprise**: Add read replicas for analytics queries, partition request_logs by month

---

## 10. Coding Standards

Follow the existing STYLEGUIDE.md with these updates for the new stack:

### Changes from Current STYLEGUIDE

| Current | New |
|---------|-----|
| TanStack Router | Next.js App Router |
| Vite | Next.js |
| GraphQL Yoga + Pothos + urql | REST API (Hono) + TanStack Query |
| React Router | Next.js `<Link>` + `useRouter` |

### Retained Patterns

- Thin React layer (business logic in pure functions)
- No `any` — use `unknown` + type guards
- Readonly props and immutable data
- TanStack Query for all dashboard data fetching
- ts-pattern for conditional rendering
- Base UI primitives + Tailwind CSS 4 + CVA
- Biome for formatting/linting
- Lucide icons
- Recharts for charts
- Arrow function components
- Code co-location
- Functional-light programming

---

## 11. Sub-Project Decomposition

This transformation is too large for a single implementation plan. It decomposes into these sub-projects, to be built in order:

### Phase 1: Foundation
1. **Monorepo scaffold** — pnpm workspace, tsconfig, biome, packages/db, packages/config, docker-compose
2. **Update STYLEGUIDE.md** — Update for new stack (Next.js App Router, Hono backend conventions, Zod validation patterns)
3. **Database schema** — Drizzle schema, migrations, tenant helpers
4. **Auth system** — Better Auth setup, sign-in/up pages, org creation

### Phase 2: Core Product
5. **Proxy engine** — Port Go proxy to Hono (providers, routing, streaming)
6. **Virtual keys** — Key management, hashing, validation
7. **Rate limiting & caching** — Redis-based rate limiter, response cache

### Phase 3: Dashboard
8. **Dashboard shell** — Layout, navigation, org switcher
9. **Provider management** — Configure AI provider keys
10. **Key management** — Create/manage virtual keys
11. **Request logs** — Log viewer with filters and search
12. **Analytics** — Usage charts, cost breakdown

### Phase 4: Business Features
13. **Budget system** — Budget CRUD, Redis-based enforcement, alerts
14. **Team management** — Invitations, roles, team CRUD
15. **Billing integration** — Paddle setup, checkout, webhook verification, plan management
16. **Feature gating** — Plan-based access control (boolean + quota gates)

### Phase 5: Polish
17. **Marketing site** — Landing page, pricing page, docs
18. **Email system** — React Email templates, Resend integration
19. **Guardrails** — Content safety rules, proxy integration
20. **Admin panel** — Internal admin for platform management
21. **Audit logs** — Enterprise audit logging

### Phase 6: Production
22. **Security hardening** — CSRF, encryption key rotation, penetration testing, security headers
23. **Deployment** — Docker, Railway/Render setup, CI/CD, connection pooling
24. **Monitoring** — Error tracking, uptime monitoring, alerting, data retention cron

Each sub-project gets its own implementation plan via the writing-plans skill.
