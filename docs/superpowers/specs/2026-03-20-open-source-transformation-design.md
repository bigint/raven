# Raven Open-Source Transformation — Design Spec

**Date:** 2026-03-20
**Status:** Approved
**Approach:** Surgical Removal (Approach 1)

## Overview

Transform Raven from a multi-tenant SaaS with tiered billing into a fully open-source, self-hosted AI model gateway. All enterprise features enabled by default. Single workspace. Dockerized for single-command deployment.

## Key Decisions

| Decision | Choice |
|----------|--------|
| Multi-tenancy | Removed — single workspace |
| Billing/pricing | Removed entirely |
| Feature gating | Removed — all features always available |
| Roles | Three roles: admin, member, viewer |
| Admin UI | Single sidebar item → tabbed page in main layout |
| Marketing site | Minimal landing page, no pricing/terms/privacy |
| Docker | App image on Docker Hub + docker-compose with Postgres/Redis |
| Cron jobs | Separate container (same image, different entrypoint) |
| Analytics retention | Admin-configurable via settings table |
| Docs app | Excluded from Docker, separate deployment concern |
| GitHub Actions cron | Removed, replaced by cron container |

---

## 1. Roles & Authentication

### New Role System

Single `role` field on `users` table with three values:

```
platformRoleEnum: "admin" | "member" | "viewer"
```

- **Admin** — Full access. Manage users, system settings, models, all features.
- **Member** — Can use all features (providers, keys, prompts, routing, budgets, guardrails, webhooks, chat). Cannot access admin panel.
- **Viewer** — Read-only. Can view dashboard, analytics, request logs. Cannot create/modify resources or use chat.

### First User Bootstrap

- First user to sign up automatically gets `admin` role
- Subsequent users default to `viewer`
- Admins can change any user's role from the admin panel

### Access Matrix

| Feature | Admin | Member | Viewer |
|---------|-------|--------|--------|
| View dashboard/analytics | Yes | Yes | Yes |
| View request logs | Yes | Yes | Yes |
| Use playground/chat | Yes | Yes | No |
| Manage providers | Yes | Yes | No |
| Manage API keys | Yes | Yes | No |
| Manage prompts | Yes | Yes | No |
| Manage routing rules | Yes | Yes | No |
| Manage budgets | Yes | Yes | No |
| Manage guardrails | Yes | Yes | No |
| Manage webhooks | Yes | Yes | No |
| View audit logs | Yes | Yes | Yes |
| Admin panel | Yes | No | No |
| Manage user roles | Yes | No | No |
| System settings | Yes | No | No |

### Removed Auth Concepts

- Organizations table and all org-related logic
- Members table (org membership)
- Invitations table and invitation flow
- Tenant middleware (`X-Org-Id` header)
- Org switcher UI component
- Onboarding flow (org creation)
- Team management page
- `X-Org-Id` header injection in API client

### Middleware Stack (New)

```
1. requestId()
2. requestTiming()
3. CORS
4. Compression
5. Security headers
6. Body size limit (10MB)
7. Auth middleware → all /v1/* routes (validates session, attaches user + role)
8. Admin middleware → /v1/admin/* routes (checks role === "admin")
9. Writer middleware → mutation endpoints (checks role === "admin" || role === "member")
```

No tenant middleware. No plan middleware.

---

## 2. Billing & Feature Gate Removal

### Deleted Entirely

**Files:**
- `packages/types/src/billing.ts`
- `packages/db/src/schema/subscriptions.ts`
- `apps/api/src/modules/billing/` (entire module)
- `apps/api/src/modules/proxy/plan-gate.ts`
- `apps/api/src/modules/proxy/plan-check.ts`
- `apps/web/src/app/(dashboard)/billing/` (entire page)
- `apps/web/src/app/(dashboard)/[slug]/settings/components/plan-subscription.tsx`

**Concepts removed:**
- Plan tiers (free/pro/team/enterprise)
- `PLAN_DETAILS` and `PLAN_FEATURES` constants
- `checkFeatureGate()` and `checkResourceLimit()` functions
- `checkPlanLimit()` monthly request quota
- `getOrgPlan()` function
- `clampAnalyticsRetention()` plan-based logic (replaced by settings-based)
- Lemon Squeezy webhook handler
- Billing API routes (`/v1/billing/*`)
- Billing UI (plan selector, subscription status, billing toggle)
- Sidebar plan-based item filtering
- `LEMONSQUEEZY_API_KEY` and `LEMONSQUEEZY_WEBHOOK_SECRET` env vars

### What Stays (unchanged)

- Budget system (user-configured cost limits, not plan-based)
- Rate limiting on virtual keys (user-configured per-key limits)
- Guardrail evaluation in proxy handler
- All proxy functionality (routing, model selection, etc.)

---

## 3. System Settings

### New `settings` Table

```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Default Settings

| Key | Default | Type | Description |
|-----|---------|------|-------------|
| `analytics_retention_days` | `365` | number | Days to keep request logs and audit logs. Admin-configurable. |
| `allow_registration` | `true` | boolean | Whether new users can self-register. |
| `instance_name` | `"Raven"` | string | Instance display name. |

### API Endpoints

- `GET /v1/admin/settings` — List all settings (admin only)
- `PUT /v1/admin/settings` — Update settings (admin only, accepts key-value pairs)
- `GET /v1/settings/public` — Public settings needed by frontend (instance_name, allow_registration)

### Retention Cleanup

- Runs in the cron container daily
- Reads `analytics_retention_days` from settings table
- Deletes `request_logs` where `createdAt < NOW() - retention_days`
- Deletes `audit_logs` where `createdAt < NOW() - retention_days`
- Logs count of deleted rows to stdout

---

## 4. Database Schema Changes

### Tables to DELETE

| Table | Reason |
|-------|--------|
| `organizations` | No multi-tenancy |
| `members` | No org membership |
| `invitations` | No invitation system |
| `subscriptions` | No billing |

### Tables to MODIFY (remove `organizationId`)

All these tables lose their `organizationId` column and associated foreign key/indexes:

- `virtual_keys` — remove `organizationId`, update indexes
- `provider_configs` — remove `organizationId`, update indexes
- `request_logs` — remove `organizationId`, update indexes
- `audit_logs` — remove `organizationId`, update indexes
- `budgets` — remove `organizationId`, update indexes
- `guardrail_rules` — remove `organizationId`, update indexes
- `routing_rules` — remove `organizationId`, update indexes
- `webhooks` — remove `organizationId`, update indexes
- `prompts` — remove `organizationId`, update indexes

### Tables to MODIFY (other changes)

**`users`:**
- Change `role` enum from `["user", "admin"]` to `["admin", "member", "viewer"]`
- Default role: `"viewer"`

### New Tables

**`settings`:**
- `key` (text, PK)
- `value` (text, not null)
- `updatedAt` (timestamp with timezone, default now())

### Enums to DELETE

- `planEnum` (free/pro/team/enterprise)
- `subscriptionStatusEnum` (active/past_due/cancelled/trialing)

### Enums to MODIFY

- `platformRoleEnum`: `["user", "admin"]` → `["admin", "member", "viewer"]`

### Migration Strategy

Single Drizzle migration that:
1. Creates `settings` table with defaults
2. Drops `subscriptions`, `invitations`, `members`, `organizations` tables
3. Drops `organizationId` columns from all affected tables
4. Alters `platformRoleEnum` to new values (map `"user"` → `"member"`)
5. Drops unused enums

---

## 5. Admin Integration into Main Sidebar

### Current State

- Separate `(admin)/` layout with its own sidebar
- 5 pages: Overview, Users, Organizations, Models, Audit Logs
- Accessed via User Menu → "Admin Panel"

### New State

- Single "Admin" item in dashboard sidebar (bottom, above user menu)
- Only visible when `user.role === "admin"`
- Opens `/admin` page within the dashboard layout
- Page has 5 tabs: Overview, Users, Models, Audit Logs, Settings

### Admin Tabs

**Overview Tab:**
- Stat cards: Total Users, Total Requests (30d), Total Cost (30d)
- Token usage breakdown: Input, Output, Reasoning, Cached
- No plan distribution (no plans)

**Users Tab:**
- DataTable: Name, Email, Role (badge), Joined Date
- Role dropdown to change user role (admin/member/viewer)
- Remove user button
- No org count column (no orgs)

**Models Tab:**
- Models grouped by provider (slug, name, count)
- "Sync Now" button
- Last sync timestamp

**Audit Logs Tab:**
- DataTable: Action, Resource Type, Actor, Timestamp
- No organization column (no orgs)

**Settings Tab (new):**
- Analytics retention days (number input)
- Allow registration (toggle)
- Instance name (text input)
- Save button

### Files Deleted

- `apps/web/src/app/(admin)/layout.tsx`
- `apps/web/src/app/(admin)/components/admin-sidebar.tsx`
- `apps/web/src/app/(admin)/admin/organizations/` (entire directory)

### Files Moved/Restructured

- Admin pages move from `(admin)/admin/*` to `(dashboard)/admin/`
- Convert from separate pages to tab panels within single page
- Admin hooks (`use-admin.ts`) move to `(dashboard)/admin/hooks/`

---

## 6. Marketing & Landing Page

### Deleted

- `(marketing)/pricing/` — pricing page
- `(marketing)/components/pricing-page.tsx` — pricing grid
- `(marketing)/components/billing-toggle.tsx` — monthly/yearly toggle
- `(marketing)/privacy/` — privacy policy
- `(marketing)/terms/` — terms of service

### Simplified

**`(marketing)/page.tsx` — Rewritten as minimal landing page:**
- Project name: "Raven"
- Tagline: "Open-source AI model gateway"
- 4-5 bullet points of key features:
  - Unified API for all LLM providers
  - Smart routing and load balancing
  - Cost tracking and budgets
  - Content guardrails and safety
  - Detailed analytics and logging
- "Get Started" CTA → `/sign-in`
- "View on GitHub" link
- "Documentation" link

**`(marketing)/layout.tsx` — Simplified:**
- Simple header with logo and sign-in link
- No complex marketing navigation

### Docs App

- `apps/docs/` stays in the repo but is excluded from Docker image
- Deployed separately (Mintlify, GitHub Pages, etc.)
- Not part of the docker-compose stack

---

## 7. Docker Setup

### Image: `raven`

Single Docker image containing both the Next.js frontend and Hono API. Published to Docker Hub.

### Dockerfile

```dockerfile
# Stage 1: Dependencies
FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/auth/package.json packages/auth/
COPY packages/config/package.json packages/config/
COPY packages/db/package.json packages/db/
COPY packages/email/package.json packages/email/
COPY packages/types/package.json packages/types/
COPY packages/ui/package.json packages/ui/
RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM deps AS builder
COPY . .
RUN pnpm build

# Stage 3: Production
FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate
WORKDIR /app

COPY --from=builder /app/apps/api/dist ./api/
COPY --from=builder /app/apps/web/.next/standalone ./web/
COPY --from=builder /app/apps/web/.next/static ./web/.next/static
COPY --from=builder /app/apps/web/public ./web/public
COPY --from=builder /app/packages/db/drizzle ./drizzle/
COPY --from=builder /app/packages/db/drizzle.config.ts ./
COPY --from=builder /app/node_modules ./node_modules/
COPY docker-entrypoint.sh ./

RUN chmod +x docker-entrypoint.sh

EXPOSE 3000 3001

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["serve"]
```

### docker-compose.yml

```yaml
services:
  raven:
    image: raven:latest
    ports:
      - "3000:3000"
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://raven:raven@postgres:5432/raven
      - REDIS_URL=redis://redis:6379
      - BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET:-changeme-generate-a-secret}
      - BETTER_AUTH_URL=http://localhost:3001
      - ENCRYPTION_SECRET=${ENCRYPTION_SECRET:-changeme-generate-a-32byte-hex}
      - APP_URL=http://localhost:3000
      - NEXT_PUBLIC_API_URL=http://localhost:3001
      - API_PORT=3001
      - NODE_ENV=production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  raven-cron:
    image: raven:latest
    command: ["node", "api/cron.js"]
    environment:
      - DATABASE_URL=postgresql://raven:raven@postgres:5432/raven
      - REDIS_URL=redis://redis:6379
      - ENCRYPTION_SECRET=${ENCRYPTION_SECRET:-changeme-generate-a-32byte-hex}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:17-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: raven
      POSTGRES_PASSWORD: raven
      POSTGRES_DB: raven
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U raven"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### docker-entrypoint.sh

```bash
#!/bin/sh
set -e

echo "Running database migrations..."
npx drizzle-kit migrate

echo "Starting Raven..."
if [ "$1" = "serve" ]; then
  # Start API in background
  node api/index.js &
  # Start Next.js in foreground
  node web/server.js
elif [ "$1" = "cron" ]; then
  node api/cron.js
else
  exec "$@"
fi
```

### Cron Container Entry Point

**New file: `apps/api/src/cron.ts`**

```typescript
// Standalone cron process
// - Model sync: every 1 hour
// - Retention cleanup: every 24 hours

import { syncModels } from "./modules/admin/models"
import { cleanupRetention } from "./modules/admin/retention"

// Run model sync immediately on startup, then every hour
await syncModels()
setInterval(() => syncModels(), 60 * 60 * 1000)

// Run retention cleanup daily
setInterval(() => cleanupRetention(), 24 * 60 * 60 * 1000)
```

---

## 8. API Route Changes

### Deleted Routes

| Route | Reason |
|-------|--------|
| `POST /webhooks/billing` | No billing |
| `GET /v1/billing/subscription` | No billing |
| `GET /v1/billing/plans` | No billing |
| `POST /v1/teams/invitations` | No teams |
| `GET /v1/teams/invitations` | No teams |
| `DELETE /v1/teams/invitations/:id` | No teams |
| `GET /v1/teams/members` | No teams |
| `DELETE /v1/teams/members/:id` | No teams |
| `GET /v1/user/invitations` | No invitations |
| `POST /v1/user/invitations/:id/accept` | No invitations |
| `POST /v1/user/invitations/:id/decline` | No invitations |
| `GET /v1/user/orgs` | No orgs |
| `POST /v1/user/orgs` | No orgs |
| `GET /v1/admin/organizations` | No orgs |
| `POST /v1/cron/sync-models` | Replaced by cron container |

### New Routes

| Route | Purpose |
|-------|---------|
| `GET /v1/admin/settings` | List all system settings |
| `PUT /v1/admin/settings` | Update system settings |
| `GET /v1/settings/public` | Public settings (instance name, allow registration) |
| `GET /v1/admin/users/:id` | Get single user (for role management) |
| `PATCH /v1/admin/users/:id` | Update user role |
| `DELETE /v1/admin/users/:id` | Delete user |

### Modified Routes

All existing `/v1/*` routes that currently require `orgId` context:
- Remove tenant middleware dependency
- Remove `organizationId` from query filters
- Resources are now global (single workspace)

---

## 9. Frontend Route Changes

### Deleted Routes

| Route | Reason |
|-------|--------|
| `/pricing` | No pricing |
| `/privacy` | Not needed |
| `/terms` | Not needed |
| `/billing` | No billing |
| `/team` | No teams (user management in admin) |
| `/onboarding` | No org creation |
| `/[slug]/settings` | No org-specific settings |

### New Routes

| Route | Purpose |
|-------|---------|
| `/admin` | Admin page with tabs (in dashboard layout) |

### Modified Routes

| Route | Change |
|-------|--------|
| `/` | Rewritten as minimal landing page |
| `/settings` | Simplified — user profile only, no billing/org tabs |
| `/profile` | Remove pending invitations section |

---

## 10. Environment Variables

### Final Required Variables

```env
# Database (required)
DATABASE_URL=postgresql://user:pass@host:5432/raven

# Redis (required)
REDIS_URL=redis://host:6379

# Authentication (required)
BETTER_AUTH_SECRET=<random-32+-chars>
BETTER_AUTH_URL=http://localhost:3001

# App URLs (required)
APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001

# Encryption (required)
ENCRYPTION_SECRET=<32-byte-hex>

# API (optional, defaults shown)
API_PORT=3001
NODE_ENV=production
```

### Optional Variables

```env
# Email (optional — app works without it, just no emails)
RESEND_API_KEY=

# Social Auth (optional — email/password always works)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### Removed Variables

```env
LEMONSQUEEZY_API_KEY        # No billing
LEMONSQUEEZY_WEBHOOK_SECRET # No billing
CRON_SECRET                 # No external cron
CLOUDFLARE_API_TOKEN        # No custom domains
CLOUDFLARE_ZONE_ID          # No custom domains
```

---

## 11. File-Level Change Summary

### Files to DELETE

```
# Billing
packages/types/src/billing.ts
packages/db/src/schema/subscriptions.ts
apps/api/src/modules/billing/index.ts
apps/api/src/modules/billing/plans.ts
apps/api/src/modules/billing/subscription.ts
apps/api/src/modules/billing/webhook.ts
apps/api/src/modules/proxy/plan-gate.ts
apps/api/src/modules/proxy/plan-check.ts
apps/web/src/app/(dashboard)/billing/page.tsx
apps/web/src/app/(dashboard)/billing/hooks/use-billing.ts
apps/web/src/app/(dashboard)/billing/components/subscription-status.tsx
apps/web/src/app/(dashboard)/billing/components/plan-selector.tsx

# Organizations & Teams
packages/db/src/schema/organizations.ts
packages/db/src/schema/members.ts
packages/db/src/schema/invitations.ts
apps/api/src/modules/teams/index.ts
apps/api/src/modules/teams/members.ts
apps/api/src/modules/teams/invitations.ts
apps/api/src/modules/user/invitations.ts
apps/api/src/middleware/tenant.ts
apps/web/src/app/(dashboard)/team/page.tsx
apps/web/src/app/(dashboard)/team/components/*
apps/web/src/app/(dashboard)/team/hooks/*
apps/web/src/app/(dashboard)/components/org-switcher.tsx
apps/web/src/app/(dashboard)/[slug]/settings/*
apps/web/src/stores/org.ts
apps/web/src/app/onboarding/*

# Admin (separate layout)
apps/web/src/app/(admin)/layout.tsx
apps/web/src/app/(admin)/components/admin-sidebar.tsx
apps/web/src/app/(admin)/admin/organizations/*

# Marketing
apps/web/src/app/(marketing)/pricing/*
apps/web/src/app/(marketing)/components/pricing-page.tsx
apps/web/src/app/(marketing)/components/billing-toggle.tsx
apps/web/src/app/(marketing)/privacy/*
apps/web/src/app/(marketing)/terms/*

# CI/CD
.github/workflows/sync-models.yml
```

### Files to MODIFY

```
# Schema (remove organizationId from all)
packages/db/src/schema/users.ts
packages/db/src/schema/virtual-keys.ts
packages/db/src/schema/provider-configs.ts
packages/db/src/schema/request-logs.ts
packages/db/src/schema/audit-logs.ts
packages/db/src/schema/budgets.ts
packages/db/src/schema/guardrails.ts
packages/db/src/schema/routing-rules.ts
packages/db/src/schema/webhooks.ts
packages/db/src/schema/prompts.ts
packages/db/src/schema/index.ts (re-exports)

# Config
packages/config/src/env.ts (remove LemonSqueezy, Cloudflare, Cron vars)
.env.example (simplified)

# API core
apps/api/src/index.ts (remove tenant middleware, billing routes, team routes)
apps/api/src/middleware/auth.ts (simplified, no org context)
apps/api/src/middleware/platform-admin.ts (stays, minor cleanup)
apps/api/src/lib/types.ts (remove orgId, orgRole from context)
apps/api/src/lib/events.ts (global events, no org prefix)
apps/api/src/lib/webhook-dispatcher.ts (no org scoping)
apps/api/src/lib/email-dispatcher.ts (simplified)
apps/api/src/lib/cache-utils.ts (remove org-prefixed keys)

# API modules (remove orgId from all queries/inserts)
apps/api/src/modules/proxy/handler.ts
apps/api/src/modules/proxy/budget-check.ts
apps/api/src/modules/analytics/helpers.ts
apps/api/src/modules/admin/users.ts
apps/api/src/modules/admin/index.ts
apps/api/src/modules/audit-logs/log.ts
apps/api/src/modules/audit-logs/list.ts
apps/api/src/modules/providers/*.ts
apps/api/src/modules/keys/*.ts
apps/api/src/modules/prompts/*.ts
apps/api/src/modules/budgets/*.ts
apps/api/src/modules/guardrails/*.ts
apps/api/src/modules/webhooks/*.ts
apps/api/src/modules/routing-rules/*.ts
apps/api/src/modules/settings/*.ts
apps/api/src/modules/user/orgs.ts → user/profile.ts (simplified)

# Web
apps/web/src/app/(dashboard)/layout.tsx
apps/web/src/app/(dashboard)/components/sidebar.tsx
apps/web/src/app/(dashboard)/components/user-menu.tsx
apps/web/src/app/(dashboard)/hooks/use-orgs.ts → removed or simplified
apps/web/src/app/(dashboard)/profile/* (remove invitations)
apps/web/src/app/(dashboard)/settings/* (simplify)
apps/web/src/app/(marketing)/page.tsx (rewrite)
apps/web/src/app/(marketing)/layout.tsx (simplify)
apps/web/src/middleware.ts (simplify protected routes)
apps/web/src/lib/api.ts (remove X-Org-Id header)
apps/web/src/lib/auth-client.ts (minor)
```

### Files to CREATE

```
# Database
packages/db/src/schema/settings.ts

# Docker
Dockerfile
docker-compose.yml
docker-entrypoint.sh
.dockerignore

# Cron
apps/api/src/cron.ts

# Admin (new location in dashboard)
apps/web/src/app/(dashboard)/admin/page.tsx
apps/web/src/app/(dashboard)/admin/components/overview-tab.tsx
apps/web/src/app/(dashboard)/admin/components/users-tab.tsx
apps/web/src/app/(dashboard)/admin/components/models-tab.tsx
apps/web/src/app/(dashboard)/admin/components/audit-logs-tab.tsx
apps/web/src/app/(dashboard)/admin/components/settings-tab.tsx
apps/web/src/app/(dashboard)/admin/hooks/use-admin.ts

# API
apps/api/src/modules/admin/settings.ts
apps/api/src/modules/admin/retention.ts
apps/api/src/middleware/writer.ts (role check for mutations)
```

---

## 12. Migration Path for Existing Deployments

For anyone upgrading from the SaaS version:

1. Backup database
2. Run migration (handles schema changes automatically)
3. Migration maps `user` role → `member`, keeps `admin` as-is
4. All resources from all organizations become global
5. Organization-scoped data keeps its content but loses the org FK
6. Duplicate resources across orgs may need manual cleanup
7. First admin user is whoever already had `admin` platform role

---

## 13. First-Run Experience

1. User runs `docker compose up`
2. Postgres and Redis start, health checks pass
3. Raven container runs migrations, starts API + Web
4. User visits `http://localhost:3000`
5. Minimal landing page with "Get Started" button
6. Click → sign up page (email/password or OAuth)
7. First user is automatically assigned `admin` role
8. Redirected to `/overview` dashboard
9. All features immediately available
10. Admin tab visible in sidebar for the admin user
