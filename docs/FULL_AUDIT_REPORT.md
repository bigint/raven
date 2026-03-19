# Raven Platform - Comprehensive UI/UX & Code Quality Audit

> **Date:** 2026-03-19
> **Audited by:** 14 specialist agents (10 FE Engineers, 2 Design Engineers, 2 QA Engineers)
> **Scope:** Full codebase - apps/web, apps/api, packages/ui, packages/types, packages/auth, packages/db

---

## Executive Summary

**Total findings: 247** across 14 audit domains.

| Severity | Count | Description |
|----------|-------|-------------|
| **Critical** | 28 | Security vulnerabilities, data integrity issues, broken accessibility, zero SSR |
| **High** | 67 | Architectural flaws, missing error boundaries, grouped query states, code duplication |
| **Medium** | 89 | Style guide violations, inconsistent patterns, missing UX feedback |
| **Low** | 63 | Polish, minor improvements, cosmetic inconsistencies |

### Top 10 Most Impactful Issues

1. **No Next.js Middleware** -- Route protection is client-only; dashboard HTML is visible before redirect
2. **Pricing page data contradicts `PLAN_FEATURES`** -- Hard-coded values are wrong (e.g., Free shows 1,000 req/mo, actual is 10,000)
3. **Every page is `"use client"`** -- Zero server-side rendering; entire app is a client SPA
4. **No `error.tsx` or `loading.tsx` anywhere** -- Any render error crashes the entire app with white screen
5. **Zero Zod validation on any form** -- All 9 forms use ad-hoc string checks instead of shared schemas
6. **Unhandled delete mutations on 8 pages** -- Errors silently swallowed, dialogs freeze
7. **Tabs/PillTabs missing ARIA tab pattern** -- Screen readers cannot perceive tab controls at all
8. **All error banners lack `role="alert"`** -- Screen readers don't announce dynamic errors
9. **`refetchOnWindowFocus: "always"` globally** -- Every tab switch fires all queries even when data is fresh
10. **30+ mutation hooks have zero `onError` callbacks** -- Failed mutations are completely silent

---

## 1. Shared UI Components

### Critical

| # | Issue | File | Line |
|---|-------|------|------|
| 1 | **Tabs/PillTabs missing ARIA tab pattern** -- No `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`. Screen readers cannot identify these as tabs (WCAG 4.1.2). | `packages/ui/src/components/tabs.tsx` | 19-66 |
| 2 | **Switch missing label association** -- Label is `<span>` with no `htmlFor`/`id` link. Clicking label doesn't toggle switch. | `packages/ui/src/components/switch.tsx` | 14-40 |
| 3 | **SearchableSelect missing ARIA combobox pattern** -- No `role="listbox"`, `role="option"`, `aria-expanded`, `aria-activedescendant`. | `packages/ui/src/components/select.tsx` | 80-204 |
| 4 | **DataTable sortable headers not keyboard accessible** -- `<th onClick>` with no `tabIndex`, `role="button"`, or `onKeyDown`. | `packages/ui/src/components/data-table.tsx` | 119 |

### High

| # | Issue | File | Line |
|---|-------|------|------|
| 5 | **Modal close button missing `aria-label`** -- SVG X icon with no accessible text. | `packages/ui/src/components/modal.tsx` | 69-83 |
| 6 | **Button missing default `type="button"`** -- Buttons inside forms inadvertently submit. | `packages/ui/src/components/button.tsx` | 36-44 |
| 7 | **Button/Input/Textarea use legacy `forwardRef`** -- React 19 supports `ref` as regular prop. | `packages/ui/src/components/button.tsx` | 36 |
| 8 | **Select `onValueChange` uses unsafe `as string` cast** | `packages/ui/src/components/select.tsx` | 234 |
| 9 | **DataTable `Column.key` typed as `string` instead of `keyof T`** | `packages/ui/src/components/data-table.tsx` | 11 |

### Medium

| # | Issue | File |
|---|-------|------|
| 10 | `Textarea` doesn't use `Field.Control` from Base UI -- breaks automatic label association | `textarea.tsx` |
| 11 | `Select` branches into two completely different component trees via `searchable` prop | `select.tsx` |
| 12 | Arbitrary values without comments: `z-[200]`, `z-[100]`, `min-w-[600px]`, `min-h-[80px]` | Multiple |
| 13 | Modal/ConfirmDialog duplicate identical animation patterns | `modal.tsx`, `confirm-dialog.tsx` |
| 14 | `Badge.dotColorMap` typed as `Record<string, string>` instead of exhaustive variant map | `badge.tsx:29` |
| 15 | `Tabs` doesn't use generics like `PillTabs<T>` does | `tabs.tsx:16` |
| 16 | Inline SVGs instead of Lucide icons (modal close, select chevron/check) | `modal.tsx`, `select.tsx` |
| 17 | `readonly` modifier missing on all component prop interfaces | All UI components |

---

## 2. Dashboard Pages

### Critical

| # | Issue | File |
|---|-------|------|
| 1 | **`useOverview` groups 5 query loading states** -- If one fails, entire page shows loading | `overview/hooks/use-overview.ts:104-109` |
| 2 | **`useAnalytics` groups 3 query loading states** | `analytics/hooks/use-analytics.ts:203-209` |
| 3 | **`useLiveRequests` uses `useEffect` for data fetching** with manual `useState` for loading/error | `requests/hooks/use-requests.ts:84-143` |

### High

| # | Issue | File |
|---|-------|------|
| 4 | **No `error.tsx` or `loading.tsx` anywhere in dashboard** -- Render errors cause white screen | Entire `(dashboard)/` group |
| 5 | **analytics/page.tsx is 359 lines with 4 inline sub-components** | `analytics/page.tsx` |
| 6 | **Massive code duplication** -- `keyFilter()`, `RANGE_MS`, `rangeToFrom()`, `DATE_RANGE_OPTIONS` duplicated in 4-6 files each | `analytics/hooks/` |
| 7 | **Custom dropdowns (OrgSwitcher, UserMenu) lack ARIA roles** -- No `role="menu"`, no keyboard nav | `components/org-switcher.tsx`, `user-menu.tsx` |
| 8 | **`window.location.reload()` on org switch** -- Loses all client state and query cache | `hooks/use-orgs.ts:39` |
| 9 | **Dashboard layout `key={pathname}` forces full re-mount** on every navigation | `layout.tsx:59-67` |

---

## 3. Forms & Data Entry

### Critical

| # | Issue | Files |
|---|-------|-------|
| 1 | **Zero Zod validation on any form** -- All 9 forms use ad-hoc `if (!field.trim())` | All form components |
| 2 | **FormState types stringly-typed** -- Numeric fields stored as `string`, manual `Number()` casts | guardrail-form, budget-form, key-form, routing-rule-form |
| 3 | **Guardrail `config` uses unsafe `as` casts** on `Record<string, unknown>` | `guardrail-form.tsx:74-86` |

### High

| # | Issue | Files |
|---|-------|-------|
| 4 | **No success feedback after mutations** -- 7 of 8 modules silently close modal | All form components |
| 5 | **Error banners lack `role="alert"`** -- Invisible to screen readers | All forms + pages (17+ instances) |
| 6 | **No field-level error display** -- All errors shown as single banner despite Input/Textarea supporting `error` prop | All 9 form components |
| 7 | **Delete handlers on 8 pages lack try/catch** -- Unhandled promise rejections | All page.tsx files |

### Medium

| # | Issue | Files |
|---|-------|-------|
| 8 | **Massive CRUD boilerplate duplication** -- Identical create/update/delete pattern in 10 hook files | All use-*.ts hooks |
| 9 | **Error banner CSS duplicated 17+ times** -- Same className string copy-pasted | All forms and pages |
| 10 | **Inconsistent Select label patterns** -- Some use `label` prop, others wrap in manual `<label>` | Various forms |

---

## 4. Chat Feature

### Critical

| # | Issue | File |
|---|-------|------|
| 1 | **No message list virtualization** -- Performance degrades with 50+ messages | `chat-messages.tsx:87-149` |
| 2 | **Streaming triggers O(n) re-renders** -- Every SSE chunk recreates entire message array + re-parses all markdown | `use-chat.ts:315-329` |
| 3 | **User images stored as base64 in state** -- Memory bloat, Object URLs never revoked | `use-chat.ts:158`, `chat-input.tsx:137` |
| 4 | **Playground API key never cleaned up on navigation** -- Only cleared on explicit "Clear" action | `use-chat.ts:128-138` |

### High

| # | Issue | File |
|---|-------|------|
| 5 | **Markdown parser missing links, blockquotes, tables** -- Common AI output renders as raw text | `markdown.tsx` |
| 6 | **No XSS sanitization layer** in markdown renderer | `markdown.tsx:67-178` |
| 7 | **No code syntax highlighting** | `markdown.tsx:76-93` |
| 8 | **Errors displayed as regular message content** -- No visual distinction, no retry button | `use-chat.ts:376-384` |
| 9 | **Dropdown uses full-screen invisible button as backdrop** -- Blocks accessibility | `chat-input.tsx:567-586` |

### Medium

| # | Issue | File |
|---|-------|------|
| 10 | **Auto-scroll fires on every chunk** even when user scrolled up | `chat-messages.tsx:79-81` |
| 11 | **Temperature slider shown when reasoning mode enabled** (but excluded from API call) | `chat-input.tsx:322-340` |
| 12 | **`useChat` hook is 420+ lines** with mixed SSE parsing, API key mgmt, message building | `use-chat.ts` |
| 13 | **Non-streaming response parsing uses 15+ `as` casts** instead of proper type guards | `use-chat.ts:343-374` |
| 14 | **`ImageAttachment` interface duplicated** across chat-input and chat-messages | Two files |

---

## 5. Custom Hooks & State Management

### Critical

| # | Issue | File |
|---|-------|------|
| 1 | **`useOrgSettings` uses manual `useState` for mutations** instead of `useMutation` -- 6 extra useState calls | `[slug]/settings/hooks/use-org-settings.ts:61-97` |
| 2 | **`useChat` is 300+ lines with 8+ mixed concerns** -- SSE parsing, key lifecycle, message serialization | `chat/hooks/use-chat.ts` |
| 3 | **`useLiveRequests` reads org store without subscription** -- `useOrgStore.getState()` snapshot won't update if org changes | `requests/hooks/use-requests.ts:103` |

### High

| # | Issue | File |
|---|-------|------|
| 4 | **Grouped loading/error states in 5 hooks** -- Violates "Handle query states independently" | `use-overview`, `use-billing`, `use-analytics`, `use-adoption`, `use-tools` |
| 5 | **Positional query keys instead of objects** in 7+ hooks -- Hard to invalidate partially | All analytics hooks |
| 6 | **Duplicate `Org` type in 3 files** | `use-orgs.ts`, `stores/org.ts`, `use-profile.ts` |
| 7 | **Duplicate `orgsQueryOptions` with different query keys** -- Same API, cached twice | `use-orgs.ts:16`, `use-profile.ts:25` |
| 8 | **`useOrgSettings` sync effect anti-pattern** -- `useEffect` to copy server state into local state | `use-org-settings.ts:45-51` |
| 9 | **30+ mutation hooks have zero `onError` callbacks** -- Mutation failures completely silent | All hook files |

---

## 6. Authentication, Routing & Layouts

### Critical (Security)

| # | Issue | File |
|---|-------|------|
| 1 | **No Next.js Middleware** -- All route protection is client-only. Dashboard HTML visible before redirect. | Missing `middleware.ts` |
| 2 | **Admin role check uses unsafe `as` assertion** -- `role` field typed as optional | `(admin)/layout.tsx:44` |
| 3 | **Org store persisted in localStorage without validation** -- Users can edit `role: "owner"` or `plan: "enterprise"` | `stores/org.ts` |

### High

| # | Issue | File |
|---|-------|------|
| 4 | **`redirect()` called during client render** -- Should use `router.replace()` in client components | `(dashboard)/layout.tsx:42-48` |
| 5 | **Sign-in swallows all errors as "Invalid email or password"** -- Network failures, rate limits hidden | `sign-in/page.tsx:24` |
| 6 | **Duplicate code between `/profile` and `/settings`** -- Near-identical pages | `profile/page.tsx`, `settings/page.tsx` |
| 7 | **`[slug]` route param is decorative** -- Never read from params; wrong slug shows correct org | `[slug]/settings/page.tsx` |
| 8 | **No `Suspense` boundary for `useSearchParams()`** in team and billing pages | `team/page.tsx`, `use-billing.ts` |

---

## 7. Marketing Pages

### Critical

| # | Issue | File |
|---|-------|------|
| 1 | **Pricing page contradicts `PLAN_FEATURES`** -- Free: shows 1,000 req (actual: 10,000), Pro: shows 50K (actual: 500K), Pro providers: "Unlimited" (actual: 10), Team: shows "Audit logs" (actual: false) | `pricing/page.tsx:9-136` vs `packages/types/src/billing.ts:67-120` |
| 2 | **No per-page SEO metadata** -- All pages share generic "Raven - AI Gateway" title | All marketing pages |
| 3 | **Marketing layout forces `"use client"`** -- All marketing pages rendered client-side including static privacy/terms | `(marketing)/layout.tsx:1` |

### High

| # | Issue | File |
|---|-------|------|
| 4 | **Zero ARIA attributes across all marketing pages** -- Mobile menu button has no `aria-label`/`aria-expanded` | All marketing files |
| 5 | **No `focus-visible` styles on any interactive element** | All marketing pages |
| 6 | **No `prefers-reduced-motion` support** -- All animations fire unconditionally | All motion components |

---

## 8. API Layer & Type System

### High

| # | Issue | File |
|---|-------|------|
| 1 | **Provider list out of sync** -- `@raven/types` has 3 providers, API backend has 4 (missing Google) | `types/src/providers.ts` vs `api/src/lib/providers.ts` |
| 2 | **30+ local interface declarations mirror DB schema** but are handwritten and can drift | All frontend hook files |
| 3 | **`@raven/types` API types are dead code** -- `OrgRole`, `GuardrailType`, etc. defined but never imported | `types/src/api.ts` |
| 4 | **DB schema uses untyped `text()`** where `pgEnum` should be used for `members.role`, `invitations.status` | `db/src/schema/members.ts:16`, `invitations.ts:21-22` |

### Medium

| # | Issue | File |
|---|-------|------|
| 5 | **API client uses unsafe `as T` cast** -- Runtime JSON never validated against generic type | `apps/web/src/lib/api.ts:48-57` |
| 6 | **Zod schemas not shared with frontend** -- Backend and frontend maintain independent type definitions | All API modules vs frontend hooks |
| 7 | **Error response shape mismatch** -- Backend sends RFC 9457 Problem Details, frontend parses `{ error: { message } }` | `api/src/index.ts:111-133` vs `web/src/lib/api.ts:23-33` |
| 8 | **`maskApiKey` operates on encrypted ciphertext** -- Shows last 4 chars of base64 ciphertext, not the original key | `api/src/modules/providers/helpers.ts:4-7` |

---

## 9. UI/UX Visual Design

### Critical

| # | Issue | File |
|---|-------|------|
| 1 | **Page header inconsistency** -- Overview/Billing use `font-bold`, rest use `font-semibold` via `PageHeader` | `overview/page.tsx:22`, `billing/page.tsx:25` |
| 2 | **Pricing page uses hand-rolled switch** instead of design system `Switch` component | `pricing/page.tsx:159-171` |

### High

| # | Issue | File |
|---|-------|------|
| 3 | **Border-radius tokens defined but never used** -- Components use raw Tailwind classes inconsistently | `globals.css` vs all components |
| 4 | **Native `<select>` elements used** instead of design system `Select` in analytics/requests | `analytics/page.tsx:260`, `requests/page.tsx:221-258` |
| 5 | **Error banner duplicated inline 17+ times** instead of being a shared component | All forms and pages |
| 6 | **Animation/shadow/duration tokens defined but unused** -- `--duration-fast`, `--shadow-xs` etc. all dead | `globals.css` |

### Medium

| # | Issue | File |
|---|-------|------|
| 7 | **Three different loading state patterns** -- Skeleton pulse, centered Spinner, raw inline spinner | Various components |
| 8 | **Focus ring inconsistency** -- Button/Switch use `focus-visible:ring-offset-2`, Input uses `:focus` without offset | `button.tsx`, `input.tsx`, `switch.tsx`, `select.tsx` |
| 9 | **Raw color values used instead of semantic tokens** -- `text-green-500` instead of `text-success` | `stat-cards.tsx`, `recent-requests.tsx`, `integrations/page.tsx` |
| 10 | **Inconsistent font-weight** -- Marketing uses `font-bold`, dashboard uses `font-semibold` except Overview/Billing | Various |

---

## 10. Interaction Design & UX Patterns

### Critical

| # | Issue | File |
|---|-------|------|
| 1 | **No focus trap in DangerZone modal** -- Tab can reach elements behind backdrop | `danger-zone.tsx:68-142` |
| 2 | **No `prefers-reduced-motion` support** across entire codebase | All motion components |
| 3 | **RequestDetail panel lacks Escape key handling** | `request-detail.tsx:22-185` |
| 4 | **No error feedback on any mutation** -- 30+ mutations have no `onError` callback | All mutation hooks |

### High

| # | Issue | File |
|---|-------|------|
| 5 | **No optimistic UI updates** -- Zero `onMutate` callbacks; every action waits for server | All mutations |
| 6 | **Chat dropdowns lack focus management** -- Full-screen invisible button as click-outside handler | `chat-input.tsx:567-586` |
| 7 | **Missing breadcrumbs** throughout dashboard | Architectural |
| 8 | **No keyboard shortcuts** -- No Cmd+K, no Escape-to-close sidebar | Architectural |

---

## 11. Accessibility (WCAG 2.2)

### High (22 findings)

Key issues:
- **Tabs/PillTabs** -- Missing `role="tablist"`, `role="tab"`, `aria-selected` (1.3.1)
- **Switch** -- No programmatic label association (1.3.1)
- **`<tr onClick>` in SessionRow/DataTable** -- Not keyboard accessible (2.1.1)
- **Custom dropdowns** (OrgSwitcher, UserMenu, chat model selector) -- No keyboard navigation (2.1.1)
- **DangerZone/RequestDetail/Mobile drawer** -- No focus trapping (2.1.2)
- **All error banners** -- Missing `role="alert"` or `aria-live` (3.3.1)
- **Icon-only buttons use `title` instead of `aria-label`** (4.1.2)
- **SearchableSelect** -- Missing `role="combobox"`, `role="listbox"` (4.1.2)
- **Chat messages** -- No `aria-live` region for new messages
- **Auth page buttons/inputs** -- Missing `focus-visible` styles (2.4.7)
- **15+ form inputs** lack proper `<label>` or `aria-label` (3.3.2)

### Medium (28 findings)

- Status dots use color-only to indicate state (1.4.1)
- `text-muted-foreground/50` opacity may fail contrast (1.4.3)
- `text-[10px]` font sizes in chat settings (1.4.3)
- Dynamic content (chat messages, live requests) has no `aria-live` region

---

## 12. Error Handling & Edge Cases

### Critical

| # | Issue | Files |
|---|-------|-------|
| 1 | **No React error boundaries anywhere** -- Zero `error.tsx` in entire app | Missing |
| 2 | **Unhandled delete mutations on 8 pages** -- Dialog freezes on API failure | All page.tsx delete handlers |
| 3 | **Unhandled `handleActivate` in prompt detail** | `prompt-detail.tsx:34-38` |

### High

| # | Issue | Files |
|---|-------|-------|
| 4 | **Fire-and-forget API delete in chat** -- No `.catch()` on key deletion | `use-chat.ts:400-404` |
| 5 | **6 fire-and-forget `.mutate()` calls** with no `onError` | providers, admin, requests |
| 6 | **`navigator.clipboard` called without error handling** in 4 places | onboarding, integrations, models, analytics |
| 7 | **Invitation accept/decline errors swallowed** -- `try/finally` with no `catch` | `profile/page.tsx:28-43` |

---

## 13. TypeScript & Code Quality

### Critical

| # | Issue | File |
|---|-------|------|
| 1 | **Biome `noExplicitAny` is `"off"`** -- STYLEGUIDE says no `any` is a MUST rule, but linter doesn't enforce it | `biome.json:77` |

### High

| # | Issue | File |
|---|-------|------|
| 2 | **15 `as` assertion chains in `use-chat.ts`** for untyped response parsing | `use-chat.ts:287-374` |
| 3 | **5 `as` casts in global error handler** `api.ts` | `api.ts:26-31` |
| 4 | **Untyped `JSON.parse` in SSE handlers** -- Returns `any` without validation | `use-requests.ts:109,116`, `use-chat.ts:65` |
| 5 | **18+ unsafe `as` casts on URL search params** without exhaustive validation | Multiple analytics/requests hooks |

### Positive Notes

- **Zero `any` usage** in entire codebase (enforced by discipline, not tooling)
- **Zero `@ts-ignore`/`@ts-expect-error`** comments
- **Only 3 suppress comments**, all well-justified
- **Strict mode + `noUncheckedIndexedAccess`** enabled -- best-in-class TS config

---

## 14. Performance & Bundle Size

### Critical

| # | Issue | Impact |
|---|-------|--------|
| 1 | **Every page is `"use client"`** -- Zero SSR, entire app is client-rendered SPA | ~50-70% reduction in initial JS possible |
| 2 | **No dynamic imports** -- Recharts (~200KB) loaded even on non-analytics pages | Major bundle bloat |
| 3 | **`refetchOnWindowFocus: "always"` globally** -- Every tab switch fires all queries | Excessive API load |

### High

| # | Issue | Impact |
|---|-------|--------|
| 4 | **`motion/react` loaded on every page** via dashboard layout wrapper | ~30KB extra per route |
| 5 | **`key={pathname}` forces full page re-mount** on every navigation | All state destroyed, all queries re-run |
| 6 | **`torph` library imported in 25 files** for simple text swap on buttons | Could be conditional render |
| 7 | **No `next/image` usage anywhere** -- Raw `<img>` tags without optimization | No lazy loading, no format conversion |
| 8 | **Overview fires 5 queries with grouped loading** -- Partial data hidden until slowest completes | Slow perceived load |

### Medium

| # | Issue | Impact |
|---|-------|--------|
| 9 | **Chat streaming is O(n^2)** -- String concatenation + full array copy per chunk | Jank on long responses |
| 10 | **Auto-scroll uses `behavior: "smooth"` during streaming** -- Animations queue up | Visual stutter |
| 11 | **`setTimeout` without cleanup** in 5 copy-to-clipboard handlers | Minor memory leak |

---

## Priority Action Plan

### Phase 1: Critical Fixes (Security + Data Integrity)

1. **Add `middleware.ts`** for route protection -- prevent unauthorized access server-side
2. **Fix pricing page** to derive values from `PLAN_FEATURES` -- eliminate data contradiction
3. **Add `error.tsx`** to `(dashboard)/`, `(admin)/`, `(marketing)/` route groups
4. **Wrap all `mutateAsync` delete handlers in try/catch** with toast error feedback
5. **Enable `noExplicitAny: "error"` in biome.json** -- zero-cost protection
6. **Fix error response parsing** in `api.ts` to read `detail` from Problem Details format

### Phase 2: Architecture (Performance + UX)

7. **Convert marketing pages to server components** -- extract `useSession` to a client island
8. **Add per-page SEO metadata** to all marketing pages
9. **Remove `key={pathname}` from dashboard layout** -- prevent full re-mounts
10. **Change `refetchOnWindowFocus` to `true`** (respect staleTime)
11. **Dynamic import recharts** and heavy tab content
12. **Decouple query loading states** in overview/analytics hooks -- handle independently
13. **Extract shared analytics utilities** (`DateRange`, `RANGE_MS`, `rangeToFrom`, `keyFilter`)

### Phase 3: Forms & Data Quality

14. **Introduce shared Zod schemas** per entity, reuse in frontend and backend
15. **Add `role="alert"` to all error banners** + extract `<FormErrorBanner>` component
16. **Add success toasts** to all mutation `onSuccess` callbacks
17. **Use Input/Textarea/Select `error` prop** for field-level validation display
18. **Add `onError` callbacks** to all mutation hooks with toast notifications

### Phase 4: Accessibility

19. **Add ARIA tab roles** to Tabs and PillTabs components
20. **Fix Switch label association** with proper `<label>` or `aria-labelledby`
21. **Add keyboard support** to DataTable sort headers and SessionRow expand/collapse
22. **Add focus trapping** to DangerZone modal, RequestDetail panel, mobile drawer
23. **Add `aria-label` to all icon-only buttons** (replace `title` attribute)
24. **Add `aria-live="polite"` region** to chat messages for screen reader announcements
25. **Add `focus-visible` ring styles** to auth pages and marketing CTAs

### Phase 5: Design Consistency

26. **Make Overview/Billing/Chat use `PageHeader`** component
27. **Create shared `ErrorBanner` component** and replace 17+ inline instances
28. **Replace native `<select>` with design system `Select`** in analytics/requests
29. **Standardize focus ring approach** -- pick `:focus-visible` with consistent offset
30. **Replace raw color values** with semantic tokens (`text-success`, `bg-info/10`)
31. **Add `prefers-reduced-motion` support** to all motion components

---

*This audit is a snapshot of the codebase at commit `5add488` on branch `ui-rf-v2`. Findings should be validated against the latest code before implementing fixes.*
