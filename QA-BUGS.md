# Raven Platform - QA Bug Report

**Date:** 2026-03-17
**Tester:** Claude (Automated E2E via Chrome)
**Environment:** Local development (`localhost:3000` / `localhost:3001`)
**User:** Admin (admin@raven.dev) — Enterprise Org
**Branch:** `rethinked-be`

---

## Summary

| Severity | Count | Fixed |
|----------|-------|-------|
| Critical | 1 | 1 |
| High | 4 | 4 |
| Medium | 5 | 5 |
| Low | 3 | 3 |
| **Total** | **13** | **13** |

> All bugs have been fixed.

---

## Critical

### BUG-001: Marketing pages inaccessible when logged in

- **Page:** `/`, `/pricing`, `/docs`, `/privacy`
- **Severity:** Critical
- **Description:** All marketing pages (homepage, pricing, docs, privacy) redirect to `/overview` when the user is authenticated. Logged-in users cannot view public-facing content like pricing plans or documentation.
- **Steps to reproduce:**
  1. Sign in as any user
  2. Navigate to `http://localhost:3000/pricing`
  3. Observe redirect to `/overview`
- **Expected:** Marketing pages should be accessible to all users regardless of auth state
- **Actual:** All marketing routes redirect authenticated users to the dashboard

---

## High

### BUG-002: Overview "Active Keys" count is wildly incorrect

- **Page:** `/overview` — Quick Actions section
- **Severity:** High
- **Description:** The Overview Quick Actions card shows "36 Active Keys" but the Virtual Keys page (`/keys`) only lists 7 keys total. The count is off by 29.
- **Steps to reproduce:**
  1. Navigate to `/overview`, scroll to Quick Actions
  2. Note "36 Active Keys"
  3. Navigate to `/keys`
  4. Count only 7 keys
- **Expected:** Counts should match
- **Actual:** Overview inflates the key count (may be counting across all orgs or including deleted keys)

### BUG-003: Overview "Providers" count mismatch

- **Page:** `/overview` — Quick Actions section
- **Severity:** High
- **Description:** Quick Actions shows "4 Providers" but the Providers page only lists 3 (Anthropic, OpenAI, Mistral AI).
- **Steps to reproduce:**
  1. Navigate to `/overview`, note "4 Providers" in Quick Actions
  2. Navigate to `/providers`
  3. Count only 3 providers
- **Expected:** Counts should match
- **Actual:** Overview shows 4, Providers page shows 3

### BUG-004: Admin panel pages have extremely low text contrast

- **Page:** `/admin/users`, `/admin/organizations`, `/admin/audit-logs`
- **Severity:** High
- **Description:** Text content (names, emails, slugs, dates, roles) across all admin table pages is rendered in very light gray, making it nearly unreadable against the white background. This is an accessibility failure (WCAG contrast ratio violation).
- **Steps to reproduce:**
  1. Navigate to `/admin/users`
  2. Observe that table body text is barely visible
- **Expected:** Text should have sufficient contrast ratio (minimum 4.5:1 per WCAG AA)
- **Actual:** Text appears washed out and nearly invisible

### BUG-005: Requests show $0.000000 cost with cache "Miss"

- **Page:** `/requests`
- **Severity:** High
- **Description:** Several requests display $0.000000 cost while simultaneously showing cache status as "Miss". If the cost is zero, it's likely a cached response, but the cache column contradicts this. This indicates either incorrect cost calculation or incorrect cache status tracking.
- **Steps to reproduce:**
  1. Navigate to `/requests`
  2. Find entries with $0.000000 cost (e.g., claude-opus-4-6, 47ms latency)
  3. Note cache column shows "Miss"
- **Expected:** Cost $0 should correlate with cache "Hit", or non-zero cost for cache "Miss"
- **Actual:** Contradictory data — zero cost with cache miss

---

## Medium

### BUG-006: Cache Hit Rate card shows wrong subtitle

- **Page:** `/overview`
- **Severity:** Medium
- **Description:** The "Cache Hit Rate" stat card displays "36 active keys" as its subtitle, which is contextually wrong. This subtitle belongs to the Keys-related card, not cache.
- **Steps to reproduce:**
  1. Navigate to `/overview`
  2. Look at the Cache Hit Rate card (rightmost stat card)
  3. Subtitle reads "36 active keys"
- **Expected:** Should display a cache-related subtitle (e.g., "Across all requests")
- **Actual:** Shows "36 active keys" — wrong context

### BUG-007: Provider names displayed in lowercase on model cards

- **Page:** `/models`
- **Severity:** Medium
- **Description:** Provider names under model cards are shown as raw lowercase identifiers ("anthropic", "openai", "mistralai") instead of properly formatted display names ("Anthropic", "OpenAI", "Mistral AI").
- **Steps to reproduce:**
  1. Navigate to `/models`
  2. Look at provider names under model cards
- **Expected:** "Anthropic", "OpenAI", "Mistral AI"
- **Actual:** "anthropic", "openai", "mistralai"

### BUG-008: Settings page shows wrong "Current" organization

- **Page:** `/settings`
- **Severity:** Medium
- **Description:** The sidebar and header show "Enterprise Org" as the active organization, but the Settings page's My Organizations section marks "Free Org" as "Current" with a green checkmark. This creates confusion about which org the user is operating in.
- **Steps to reproduce:**
  1. Ensure "Enterprise Org" is selected in the sidebar org switcher
  2. Navigate to `/settings`
  3. Observe "Free Org" has the "Current" badge
- **Expected:** "Enterprise Org" should be marked as "Current"
- **Actual:** "Free Org" is marked as "Current" despite Enterprise Org being active in the sidebar

### BUG-009: Billing plan cards have grammar errors

- **Page:** `/billing`
- **Severity:** Medium
- **Description:** Plan feature lists use plural nouns with singular quantities: "1 budgets" and "1 seats" on Free and Pro plans.
- **Steps to reproduce:**
  1. Navigate to `/billing`
  2. Look at Free plan features
  3. See "1 budgets" and "1 seats"
- **Expected:** "1 budget", "1 seat" (singular)
- **Actual:** "1 budgets", "1 seats" (incorrect plural)

### BUG-010: Token tracking missing for some providers/models

- **Page:** `/analytics`, `/logs`
- **Severity:** Medium
- **Description:** Several models show 0 input/output/cached/reasoning tokens despite having recorded requests. Affected models include `codestral-latest` (6 requests, all 0 tokens), `gpt-5.3-codex-spark` (2 requests, all 0 tokens), and multiple OpenRouter free models. This suggests token usage is not being captured for certain provider configurations.
- **Steps to reproduce:**
  1. Navigate to `/analytics`, scroll to model usage table
  2. Note codestral-latest: 6 requests, 0/0/0/0 tokens
  3. Also visible on `/logs` — some sessions show 0 tokens with recorded requests
- **Expected:** Token counts should be populated for all successful requests
- **Actual:** Token counts are 0 for some providers

---

## Low

### BUG-011: Sign-in page missing "Forgot Password" link

- **Page:** `/sign-in`
- **Severity:** Low
- **Description:** The sign-in page has no "Forgot Password" option. This is a standard feature expected by users for self-service password recovery.
- **Steps to reproduce:**
  1. Navigate to `/sign-in`
  2. Look for password recovery option
- **Expected:** A "Forgot Password?" link below the password field
- **Actual:** No password recovery option available

### BUG-012: Logs page missing STATUS column

- **Page:** `/logs`
- **Severity:** Low
- **Description:** The Logs page shows session-level data but lacks a STATUS column (unlike the Requests page which shows HTTP status codes). This makes it impossible to quickly identify failed sessions.
- **Steps to reproduce:**
  1. Navigate to `/logs`
  2. Compare columns with `/requests`
  3. Note no STATUS column exists
- **Expected:** A status indicator column to distinguish successful vs failed sessions
- **Actual:** No status information available at the session level

### BUG-013: Team page owner account shows delete button

- **Page:** `/team`
- **Severity:** Low
- **Description:** The organization owner (Admin) row has a delete (trash) button in the Actions column. Owners should not be removable from their own organization, and showing the option is misleading.
- **Steps to reproduce:**
  1. Navigate to `/team`
  2. Find the "Admin" row with "owner" role
  3. Note the trash icon in the Actions column
- **Expected:** Delete button should be hidden or disabled for the owner
- **Actual:** Delete button is visible and potentially clickable

---

## Pages Tested

| Page | Route | Status |
|------|-------|--------|
| Overview | `/overview` | Bugs found |
| Playground (Chat) | `/chat` | Working |
| Analytics | `/analytics` | Bugs found |
| Providers | `/providers` | Working |
| Keys | `/keys` | Working |
| Prompts | `/prompts` | Working |
| Models | `/models` | Bugs found |
| Routing | `/routing` | Working (empty state) |
| Requests | `/requests` | Bugs found |
| Logs | `/logs` | Bugs found |
| Tool Use | `/tools` | Working |
| Adoption | `/adoption` | Working |
| Budgets | `/budgets` | Working (empty state) |
| Guardrails | `/guardrails` | Working |
| Team | `/team` | Bugs found |
| Billing | `/billing` | Bugs found |
| Webhooks | `/webhooks` | Working (empty state) |
| Settings | `/settings` | Bugs found |
| Sign In | `/sign-in` | Bugs found |
| Sign Up | `/sign-up` | Working |
| Admin Overview | `/admin` | Working |
| Admin Users | `/admin/users` | Bugs found |
| Admin Organizations | `/admin/organizations` | Bugs found |
| Admin Audit Logs | `/admin/audit-logs` | Bugs found |
| Marketing (Home) | `/` | Bugs found |
| Marketing (Pricing) | `/pricing` | Bugs found |
| Marketing (Docs) | `/docs` | Bugs found |
| Marketing (Privacy) | `/privacy` | Bugs found |

## AI Proxy Features Tested

| Feature | Status |
|---------|--------|
| Chat streaming (SSE) | Working |
| Model selection | Working |
| Temperature control | Working |
| Chat memory setting | Working |
| Request metadata display | Working |
| Multi-provider support | Working |
| OpenAI-compatible `/v1/models` | Working |
| Health endpoint | Working |
