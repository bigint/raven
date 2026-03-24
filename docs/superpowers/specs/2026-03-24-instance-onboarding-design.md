# Instance Onboarding Design

## Problem

When Raven is deployed fresh, there's no setup flow. The first user signs up through the regular sign-up page and gets auto-promoted to admin via a database hook. There's no way to configure the instance name before using the platform. The experience feels accidental rather than intentional.

## Solution

A two-step onboarding wizard at `/setup` that appears on fresh instances (zero users in the database). It collects the admin account credentials and instance name, then signs the user in and redirects to the dashboard.

## Design Decisions

- **Setup detection:** Count users in the database. Zero users = needs setup. No extra state column or settings key required.
- **Route:** `/setup` as a top-level route outside both `(auth)` and `(dashboard)` groups.
- **Layout:** Split-panel matching the existing sign-in/sign-up screens (branding left, form right) with a step indicator.
- **Scope:** Minimal — admin account (name, email, password) + instance name. No email config or provider setup during onboarding.

## Architecture

### API Endpoints

**`GET /v1/setup/status`** (public, no auth)
- Returns `{ needsSetup: boolean }`
- Queries `SELECT count(*) FROM users`
- If count is 0, returns `{ needsSetup: true }`

**`POST /v1/setup/complete`** (public, no auth)
- Request body: `{ name: string, email: string, password: string, instanceName?: string }`
- Guards: rejects with 409 if any users exist
- Actions:
  1. Creates the user via Better Auth's `signUp.email` (internal API call) — the existing database hook auto-promotes to admin
  2. Saves `instance_name` to the `settings` table (upsert, defaults to "Raven" if omitted)
  3. Creates a session for the new user
  4. Returns session token in response (set-cookie header via Better Auth)

### Frontend

**New files:**
- `apps/web/src/app/setup/page.tsx` — page component with metadata
- `apps/web/src/app/setup/setup-wizard.tsx` — client component with the two-step form

**Setup wizard steps:**
1. **Admin Account** — name, email, password fields (same validation as sign-up: min 8 char password)
2. **Instance Name** — single text input, pre-filled with "Raven", can be changed

**Middleware changes (`apps/web/src/middleware.ts`):**
- On every request, check setup status (cached — see below)
- If `needsSetup` is true and path is not `/setup`, redirect to `/setup`
- If `needsSetup` is false and path is `/setup`, redirect to `/overview`
- Add `/setup` to the matcher

**Setup status caching:**
- The middleware calls `GET /v1/setup/status` on each request
- Once setup is complete, the API always returns `needsSetup: false` (there will always be ≥1 user)
- The API endpoint is lightweight (single count query) so no complex caching needed
- After setup completes, the redirect to `/overview` triggers a normal auth flow

### API Module

**New files:**
- `apps/api/src/modules/setup/index.ts` — Hono route group with status + complete endpoints
- `apps/api/src/modules/setup/schema.ts` — Zod validation for the complete request body

**Registration in `apps/api/src/index.ts`:**
- Mount as public routes (no auth middleware): `app.route("/v1/setup", createSetupModule(db, auth, env))`
- Placed alongside other public routes (models, public settings, invitations)

## Step Flow

```
User visits any page
  → Middleware checks GET /v1/setup/status
  → needsSetup: true → redirect to /setup
  → /setup Step 1: Admin account form
  → User fills name, email, password → clicks "Next"
  → /setup Step 2: Instance name form (pre-filled "Raven")
  → User optionally changes name → clicks "Complete Setup"
  → POST /v1/setup/complete
  → API creates user (auto-admin), saves instance_name, creates session
  → Frontend receives session cookie → redirects to /overview
```

## Safety

- `POST /v1/setup/complete` checks user count before creating — returns 409 Conflict if any users exist
- This makes the endpoint idempotent-safe: it can only succeed once per instance
- No auth middleware needed (no users exist yet to authenticate)
- After setup, `/setup` redirects away — the wizard is unreachable once a user exists
- The user count check and user creation should be done carefully to avoid race conditions (the window is tiny since this is a first-run operation, and the unique email constraint on the users table provides a secondary guard)

## Out of Scope

- Email/Resend configuration during setup
- AI provider configuration during setup
- Multi-step onboarding checklist on the dashboard after setup
- Instance logo/branding customization
