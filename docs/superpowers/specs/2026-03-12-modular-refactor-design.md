# Raven Platform — Modular Refactor & Design Polish

**Date:** 2026-03-12
**Status:** Approved
**Approach:** Parallel Streams with Shared Foundation (Approach B)

## Overview

Full-stack refactoring of the Raven platform across three dimensions: modularity (component extraction), scalability (backend hardening), and design taste (motion, visual hierarchy, dark mode). Pre-launch — no backward compatibility constraints.

## 1. Design System Foundation (`@raven/ui`)

The `@raven/ui` package currently exports only `cn()`. Every page reinvents buttons, modals, tables, badges, inputs, and form layouts with raw Tailwind classes.

### Components

Build a variant-driven component library using `cva` (already installed):

| Component | Variants | Replaces |
|-----------|----------|----------|
| `Button` | `primary`, `secondary`, `destructive`, `ghost` + `sm`, `md`, `lg` | ~40 raw button patterns |
| `Modal` | sizes (`sm`, `md`, `lg`) + close-on-escape + focus trap | 12+ hand-rolled modals |
| `DataTable` | sortable headers, empty states, loading skeletons | 6 raw `<table>` implementations |
| `Badge` | `success`, `warning`, `error`, `neutral` + role badges | Status/role badges in every page |
| `Input` / `Textarea` | with label, error state, description | Repeated in every form |
| `Select` | Dropdown select | 143-line custom `select.tsx` |
| `EmptyState` | icon + message + optional action | 8+ empty state blocks |
| `ConfirmDialog` | destructive action confirmation | 4+ delete confirmation modals |
| `PageHeader` | title + description + action buttons | Every page header |
| `Tabs` | URL-synced tab groups | Team page tab implementation |
| `Spinner` | loading indicator | 5+ inline spinner implementations |
| `Avatar` | initials + image + sizes | User/member avatars |
| `Switch` | toggle switch | Keys page active toggle |

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

Extend `globals.css` with:
- Animation tokens: `--duration-fast: 150ms`, `--duration-normal: 200ms`, `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`
- Border radius tokens: `--radius-sm`, `--radius-md`, `--radius-lg`
- Shadow tokens for elevation layers
- Additional semantic colors: `--color-warning`, `--color-info`, `--color-card`, `--color-surface`

## 2. Frontend Page Decomposition

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

### Data Fetching Migration

All pages migrate from raw `useState` + `useEffect` + `useCallback` to **TanStack Query** (already installed, mandated by STYLEGUIDE.md but not yet used):

```typescript
export function useKeys() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['keys'],
    queryFn: () => api.get<VirtualKey[]>('/v1/keys'),
  })

  useEventStream({
    enabled: query.isSuccess,
    events: ['key.created', 'key.updated', 'key.deleted'],
    onEvent: () => queryClient.invalidateQueries({ queryKey: ['keys'] }),
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateKeyInput) => api.post<CreateKeyResponse>('/v1/keys', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['keys'] }),
  })

  return { ...query, create: createMutation }
}
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

### 3b. Middleware Improvements

- **Error boundary middleware** — centralized error-to-response mapping
- **Request ID middleware** — unique ID per request, propagated through logs
- **Request timing middleware** — standardized latency tracking

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

### 3d. Shared Validation Layer

Extract Zod schemas into co-located `schema.ts` files per module, shared with `@raven/types` for frontend form validation reuse.

## 4. Design Taste & Visual Polish

### 4a. Motion System

| Pattern | Where | Implementation |
|---------|-------|----------------|
| Modal enter/exit | All modals | Scale 95% + fade, 200ms ease-out |
| Page transitions | Route changes | Fade + subtle upward slide, 150ms |
| List stagger | Tables, card lists | 30ms stagger delay per row |
| Hover lift | Cards, table rows | translateY(-1px) + shadow increase |
| Tab indicator | Tab bars | Animated underline slides (layoutId) |
| Sidebar active | Nav items | Background color morph |
| Skeleton pulse | Loading states | Shimmer animation on placeholders |
| Button press | All buttons | Scale to 98% on active, spring back |

CSS transitions for simple hover/active. **Framer Motion** (new dependency) for layout animations.

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

`@media (prefers-color-scheme: dark)` with inverted token values. Zero component changes needed — all components reference tokens.

## 5. Agent Team Structure

### Phase 0 — Foundation (Sequential)

| Task | Description |
|------|-------------|
| Build `@raven/ui` component library | All 13 components with variants |
| Add design tokens | Extended palette, animation tokens, dark mode |
| Add Framer Motion | Install + configure |
| Set up TanStack Query provider | QueryClientProvider in root layout |
| Standardize API response envelope | Backend middleware for consistent wrapping |

### Phase 1 — Parallel Execution (8 agents in worktrees)

| Agent | Role | Scope |
|-------|------|-------|
| Frontend 1 | Frontend Dev | `team`, `keys`, `profile` pages |
| Frontend 2 | Frontend Dev | `providers`, `budgets`, `requests` pages |
| Frontend 3 | Frontend Dev | `overview`, `analytics`, `billing`, `settings` + layout |
| Backend 1 | Backend Dev | Proxy handler decomposition + middleware |
| Backend 2 | Backend Dev | API response standardization + Zod schemas |
| Designer | Design Engineer | Motion system, visual polish, dark mode |
| QA | Quality Assurance | Type checking, lint, integration review |
| Security | Security Engineer | Crypto audit, auth flows, input validation |

**No-conflict guarantee:** Each agent owns distinct files. Frontend agents split by page directory. Backend agents split by concern. Designer touches CSS and UI styling only. QA/Security review after others complete.

### Phase 2 — Integration (Sequential)

- Merge all worktree branches
- Resolve conflicts (minimal due to file ownership)
- QA: full type check + lint
- Security: final audit
- Designer: visual review pass

## Dependencies

**New:**
- `framer-motion` — layout animations, modal transitions, list stagger

**Already installed but unused:**
- `@tanstack/react-query` — migrate all data fetching
- `class-variance-authority` — component variants in `@raven/ui`
