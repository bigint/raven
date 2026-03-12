# Raven Platform — Modular Refactor & Design Polish

**Date:** 2026-03-12
**Status:** Approved
**Approach:** Parallel Streams with Shared Foundation (Approach B)

## Overview

Full-stack refactoring of the Raven platform across three dimensions: modularity (component extraction), scalability (backend hardening), and design taste (motion, visual hierarchy, dark mode). Pre-launch — no backward compatibility constraints.

## 1. Design System Foundation (`@raven/ui`)

The `@raven/ui` package currently exports only `cn()`. Every page reinvents buttons, modals, tables, badges, inputs, and form layouts with raw Tailwind classes.

### Components

Build a variant-driven component library using `cva` (already installed). Interactive components (`Modal`, `Select`, `ConfirmDialog`) use **Base UI** (`@base-ui-components/react`) for accessible primitives (focus trap, keyboard navigation, ARIA attributes) — installed as a new dependency in `@raven/ui`.

| Component | Variants | Replaces |
|-----------|----------|----------|
| `Button` | `primary`, `secondary`, `destructive`, `ghost` + `sm`, `md`, `lg` | ~40 raw button patterns |
| `Modal` | sizes (`sm`, `md`, `lg`) + close-on-escape + focus trap (Base UI Dialog) | 12+ hand-rolled modals |
| `DataTable` | sortable headers, empty states, loading skeletons | 6 raw `<table>` implementations |
| `Badge` | `success`, `warning`, `error`, `neutral` + role badges | Status/role badges in every page |
| `Input` / `Textarea` | with label, error state, description | Repeated in every form |
| `Select` | Dropdown select (Base UI Select) | 143-line custom `select.tsx` |
| `EmptyState` | icon + message + optional action | 8+ empty state blocks |
| `ConfirmDialog` | destructive action confirmation (Base UI AlertDialog) | 4+ delete confirmation modals |
| `PageHeader` | title + description + action buttons | Every page header |
| `Tabs` | URL-synced tab groups | Team page tab implementation |
| `Spinner` | loading indicator | 5+ inline spinner implementations |
| `Avatar` | initials + image + sizes | User/member avatars |
| `Switch` | toggle switch (Base UI Switch) | Keys page active toggle |

### File Structure

```
packages/ui/src/
├── components/
│   ├── button.tsx
│   ├── modal.tsx
│   ├── data-table.tsx
│   ├── badge.tsx
│   ├── input.tsx
│   ├── select.tsx
│   ├── empty-state.tsx
│   ├── confirm-dialog.tsx
│   ├── page-header.tsx
│   ├── tabs.tsx
│   ├── spinner.tsx
│   ├── avatar.tsx
│   └── switch.tsx
├── cn.ts
└── index.ts
```

### Design Tokens

Design tokens live in `apps/web/src/app/globals.css` (the consuming app's CSS, where `@raven/ui` components are rendered). Components in `@raven/ui` reference CSS custom properties — the host app provides the values. Extend with:

- Animation tokens: `--duration-fast: 150ms`, `--duration-normal: 200ms`, `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`
- Border radius tokens: `--radius-sm`, `--radius-md`, `--radius-lg`
- Shadow tokens for elevation layers
- Additional semantic colors: `--color-warning`, `--color-info`, `--color-card`, `--color-surface`

## 2. Frontend Page Decomposition

### Conventions

To ensure consistency across all agents:

- **Component syntax:** Arrow functions (`const KeyList = () => {}`) per STYLEGUIDE, not function declarations
- **Hook filenames:** kebab-case (`use-keys.ts`) — matches existing codebase convention (`use-event-stream.ts`)
- **Component filenames:** kebab-case (`key-list.tsx`) — per STYLEGUIDE
- **All components include `"use client"` directive** since they use hooks/interactivity

### Pattern Per Page

```
app/(dashboard)/<page>/
├── page.tsx              # ~40 lines — orchestrator
├── components/
│   ├── <entity>-list.tsx
│   ├── <entity>-form.tsx
│   └── ...
└── hooks/
    └── use-<entity>.ts   # TanStack Query + event stream
```

### Decomposition Matrix

| Page | Current Lines | Extractions |
|------|--------------|-------------|
| `team` | 759 | `MemberList`, `InvitationList`, `TeamList`, `InviteForm`, `TeamForm`, `useTeamData` |
| `keys` | 654 | `KeyList`, `KeyForm`, `KeyReveal`, `useKeys` |
| `profile` | 583 | `ProfileForm`, `OrgList`, `CreateOrgForm`, `useProfile` |
| `providers` | 538 | `ProviderList`, `ProviderForm`, `useProviders` |
| `budgets` | 508 | `BudgetList`, `BudgetForm`, `useBudgets` |
| `requests` | 483 | `RequestTable`, `RequestFilters`, `useRequests` |
| `settings` | 416 | `SettingsForm`, `DangerZone`, `useSettings` |
| `overview` | 410 | `StatCards`, `UsageChart`, `RecentRequests`, `useOverview` |
| `billing` | 337 | `PlanSelector`, `SubscriptionStatus`, `useBilling` |
| `analytics` | 283 | `UsageCharts`, `TokenBreakdown`, `useAnalytics` |

### Dashboard Layout Decomposition

`layout.tsx` (273 lines) splits into:
- `Sidebar` component
- `OrgSwitcher` component
- `UserMenu` component
- `useOrgs` hook

### Shared Constants Extraction

Duplicated constants across pages (e.g., `PROVIDER_LABELS` in both `overview/page.tsx` and `providers/page.tsx`) are extracted to `@raven/types` so all pages reference a single source of truth.

### Data Fetching Migration

All pages migrate from raw `useState` + `useEffect` + `useCallback` to **TanStack Query** using the **query options factory** pattern per STYLEGUIDE:

```typescript
// Query options factory — composable, works with preloading
export const keysQueryOptions = () =>
  queryOptions({
    queryKey: ['keys'],
    queryFn: () => api.get<VirtualKey[]>('/v1/keys'),
  })

// Mutations as standalone hooks
export const useCreateKey = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateKeyInput) => api.post<CreateKeyResponse>('/v1/keys', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['keys'] }),
  })
}
```

Event stream integration uses `useEventStream` to invalidate query caches:

```typescript
// In the page orchestrator or a thin wrapper hook
const keysQuery = useQuery(keysQueryOptions())
const queryClient = useQueryClient()

useEventStream({
  enabled: keysQuery.isSuccess,
  events: ['key.created', 'key.updated', 'key.deleted'],
  onEvent: () => queryClient.invalidateQueries({ queryKey: ['keys'] }),
})
```

## 3. Backend Hardening

### 3a. Proxy Handler Decomposition

Split `handler.ts` (383 lines) into focused modules:

```
modules/proxy/
├── handler.ts            # ~80 lines — pipeline orchestrator
├── auth.ts               # Key extraction, validation, hash lookup
├── rate-limiter.ts       # Redis sliding window
├── provider-resolver.ts  # Path parsing, config lookup, key decryption
├── upstream.ts           # Build URL, forward headers, make request
├── response.ts           # Streaming vs buffered, strip hop-by-hop headers
├── logger.ts             # Async request logging + event publishing
├── token-usage.ts        # OpenAI/Anthropic token extraction + cost
└── providers/
    └── registry.ts       # Provider adapters (existing)
```

Pipeline: `authenticateKey -> checkRateLimit -> resolveProvider -> forwardUpstream -> logRequest`

**Known gap — streaming token extraction:** Currently streaming responses log `inputTokens: 0, outputTokens: 0, cost: 0`. This is a billing-critical issue for a SaaS. The `token-usage.ts` module should include a `StreamTokenAccumulator` that parses SSE chunks and accumulates token counts from the final `[DONE]` or `message_stop` event. Scoped into this refactor for Backend 1.

### 3b. Middleware Improvements

- **Error boundary middleware** — centralized error-to-response mapping. Update the existing error handler in `index.ts` to wrap errors in `{ error: { code, message } }` format
- **Request ID middleware** — unique ID per request, propagated through logs
- **Request timing middleware** — standardized latency tracking
- **Fix tenant middleware type safety** — replace `c.get("user" as never)` cast with properly typed Hono context variables

### 3c. API Response Consistency

Standardize all responses:

```typescript
// Success
{ data: T }

// Error
{ error: { code: string, message: string } }

// List
{ data: T[], meta?: { total: number } }
```

**Migration order (all in Phase 0, done atomically):**
1. Update error handler in `index.ts` to wrap errors in `{ error: { ... } }`
2. Add response envelope middleware that wraps successful responses in `{ data: T }`
3. Update `apps/web/src/lib/api.ts` client to unwrap `{ data: T }` from responses
4. Both changes ship together so the frontend and backend stay in sync

### 3d. Shared Validation Layer

Extract Zod schemas into co-located `schema.ts` files per module, shared with `@raven/types` for frontend form validation reuse.

## 4. Design Taste & Visual Polish

### 4a. Motion System

| Pattern | Where | Implementation |
|---------|-------|----------------|
| Modal enter/exit | All modals | Scale 95% + fade, 200ms ease-out |
| List stagger | Tables, card lists | 30ms stagger delay per row |
| Hover lift | Cards, table rows | translateY(-1px) + shadow increase |
| Tab indicator | Tab bars | Animated underline slides (layoutId) |
| Sidebar active | Nav items | Background color morph |
| Skeleton pulse | Loading states | Shimmer animation on placeholders |
| Button press | All buttons | Scale to 98% on active, spring back |

**Framer Motion** is scoped to **component-level animations only** (modals, lists, tab indicators) — not cross-route page transitions, which are complex with Next.js 15 App Router. Simple CSS transitions handle hover/active states. Page transitions use CSS `@starting-style` + `transition-behavior: allow-discrete` where supported, with graceful degradation.

### 4b. Visual Hierarchy

- Page headers: subtle gradient-fade bottom border
- Cards: layered shadows (`shadow-sm` default, `shadow-md` hover) instead of flat borders
- Empty states: larger icons, softer colors, more whitespace
- Badges: pill-shaped with dot indicator for status
- Sidebar: active item gets subtle left border accent

### 4c. Typography

- Page titles: `text-2xl font-semibold tracking-tight` (from `font-bold`)
- Consistent `text-sm` body with `leading-relaxed`
- `font-mono` with reduced size for API keys and code

### 4d. Color System Extension

```css
--color-warning: #f59e0b;
--color-warning-foreground: #ffffff;
--color-info: #3b82f6;
--color-info-foreground: #ffffff;
--color-card: #ffffff;
--color-card-foreground: #0a0a0a;
--color-surface: #fafafa;
```

### 4e. Dark Mode

`@media (prefers-color-scheme: dark)` with inverted token values in `globals.css`. All `@raven/ui` components use CSS custom properties exclusively — no hardcoded colors like `bg-blue-500/10`. Any hardcoded color values in existing page code (e.g., `bg-white`, `text-neutral-900`) are migrated to token references during the page decomposition work by frontend agents. The Designer agent audits and catches any remaining hardcoded values.

## 5. Agent Team Structure

### Phase 0 — Foundation (Sequential)

| # | Task | Description |
|---|------|-------------|
| 1 | Add `@raven/ui` as dependency of `@raven/web` | Add `"@raven/ui": "workspace:*"` to web app's `package.json` |
| 2 | Install Base UI in `@raven/ui` | `@base-ui-components/react` for accessible primitives |
| 3 | Install Framer Motion in `@raven/web` | For component-level animations |
| 4 | Build `@raven/ui` core components | Priority subset: `Button`, `Input`, `Badge`, `Spinner`, `PageHeader`, `Modal`, `ConfirmDialog` |
| 5 | Build `@raven/ui` remaining components | `DataTable`, `Select`, `EmptyState`, `Tabs`, `Avatar`, `Switch` |
| 6 | Add design tokens to `globals.css` | Extended palette, animation tokens, radius, shadows, dark mode |
| 7 | Set up TanStack Query provider | Create `providers.tsx` client component wrapping `QueryClientProvider`, import in root `layout.tsx` |
| 8 | Standardize API response envelope | Backend middleware + error handler update + `api.ts` client update (atomic) |
| 9 | Extract shared constants to `@raven/types` | `PROVIDER_LABELS`, role mappings, and other duplicated constants |

### Phase 1 — Parallel Execution (8 agents in worktrees)

| Agent | Role | Scope | Owned Files |
|-------|------|-------|-------------|
| Frontend 1 | Frontend Dev | Decompose `team`, `keys`, `profile` pages | `app/(dashboard)/team/`, `keys/`, `profile/` |
| Frontend 2 | Frontend Dev | Decompose `providers`, `budgets`, `requests` pages | `app/(dashboard)/providers/`, `budgets/`, `requests/` |
| Frontend 3 | Frontend Dev | Decompose `overview`, `analytics`, `billing`, `settings` + dashboard layout | `app/(dashboard)/overview/`, `analytics/`, `billing/`, `settings/`, `(dashboard)/layout.tsx` → `(dashboard)/components/` |
| Backend 1 | Backend Dev | Proxy handler decomposition + middleware + streaming token extraction | `modules/proxy/`, `middleware/` |
| Backend 2 | Backend Dev | Zod schema extraction across all modules | `modules/*/schema.ts`, `packages/types/` |
| Designer | Design Engineer | Motion system, visual polish, dark mode | `globals.css`, `packages/ui/src/components/` styling refinements only |
| QA | Quality Assurance | Type checking, lint, review all agent outputs | Cross-cutting (read-only, runs after others) |
| Security | Security Engineer | Audit crypto, auth flows, input validation | Cross-cutting (read-only, runs after others) |

**Conflict boundaries:**
- API response envelope and `api.ts` client are finalized in Phase 0 — no agent modifies them in Phase 1
- Frontend agents import from `@raven/ui` (read-only) and own their page directories exclusively
- Backend agents split cleanly: Backend 1 owns `modules/proxy/` + `middleware/`, Backend 2 owns `modules/*/schema.ts`
- Designer modifies only `globals.css` and `packages/ui/src/components/` styling (no structural changes to components)
- QA and Security are read-only reviewers, run after implementation agents complete

### Phase 2 — Integration (Sequential)

- Merge all worktree branches
- Resolve any conflicts (minimal due to file ownership boundaries)
- QA: full type check + lint across entire codebase
- Security: final audit of crypto, auth, and input validation
- Designer: visual review pass for consistency

## Dependencies

**New:**
- `framer-motion` — component-level animations (modals, lists, tab indicators)
- `@base-ui-components/react` — accessible primitives for Modal, Select, ConfirmDialog, Switch

**Already installed but unused:**
- `@tanstack/react-query` — migrate all data fetching
- `class-variance-authority` — component variants in `@raven/ui`
