# Instance Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a two-step onboarding wizard (`/setup`) that creates the admin account and sets the instance name on fresh Raven deployments.

**Architecture:** New API module at `/v1/setup` with two public endpoints (status check + complete). New Next.js route at `/setup` with a split-panel wizard matching existing auth screens. Middleware updated to redirect fresh instances to `/setup`.

**Tech Stack:** Hono (API routes), Zod (validation), Better Auth (`auth.api.signUpEmail`), Next.js App Router, React 19, Tailwind CSS 4, Drizzle ORM.

**Note:** This project has no tests. Do not create test files.

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `apps/api/src/modules/setup/schema.ts` | Zod schema for setup complete request |
| Create | `apps/api/src/modules/setup/index.ts` | Hono route group: GET status + POST complete |
| Modify | `apps/api/src/index.ts:141-147` | Register setup module as public route |
| Create | `apps/web/src/app/setup/page.tsx` | Page component with metadata |
| Create | `apps/web/src/app/setup/setup-wizard.tsx` | Client component: two-step wizard form |
| Modify | `apps/web/src/middleware.ts` | Add setup redirect logic |

---

### Task 1: Setup API — Zod Schema

**Files:**
- Create: `apps/api/src/modules/setup/schema.ts`

- [ ] **Step 1: Create the validation schema**

```typescript
import { z } from "zod";

export const setupCompleteSchema = z.object({
  email: z.string().email(),
  instanceName: z.string().min(1).max(100).optional(),
  name: z.string().min(1).max(100),
  password: z.string().min(8)
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/modules/setup/schema.ts
git commit -m "feat: add setup complete validation schema"
```

---

### Task 2: Setup API — Route Module

**Files:**
- Create: `apps/api/src/modules/setup/index.ts`

**Context:** The seed script at `scripts/seed.ts:28` shows the exact Better Auth server-side API: `auth.api.signUpEmail({ body: { name, email, password } })`. It returns `{ user, session }`. The `ConflictError` class is at `apps/api/src/lib/errors.ts:63`. The `success` helper is at `apps/api/src/lib/response.ts:3`. The settings upsert pattern is at `apps/api/src/modules/admin/settings.ts:23-35`.

- [ ] **Step 1: Create the setup module**

```typescript
import type { Auth } from "@raven/auth";
import type { Database } from "@raven/db";
import { settings, users } from "@raven/db";
import { count } from "drizzle-orm";
import { Hono } from "hono";
import { ConflictError, ValidationError } from "@/lib/errors";
import { success } from "@/lib/response";
import { setupCompleteSchema } from "./schema";

export const createSetupModule = (db: Database, auth: Auth) => {
  const app = new Hono();

  // Public: check if instance needs setup
  app.get("/status", async (c) => {
    const [result] = await db.select({ value: count() }).from(users);
    return success(c, { needsSetup: result?.value === 0 });
  });

  // Public: complete initial setup (create admin + set instance name)
  app.post("/complete", async (c) => {
    const body = await c.req.json();
    const parsed = setupCompleteSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid setup data", {
        errors: parsed.error.flatten().fieldErrors
      });
    }

    const { email, instanceName, name, password } = parsed.data;

    // Guard: reject if any users already exist
    const [userCount] = await db.select({ value: count() }).from(users);
    if (userCount && userCount.value > 0) {
      throw new ConflictError("Setup has already been completed");
    }

    // Create admin user via Better Auth (database hook auto-promotes first user to admin)
    const result = await auth.api.signUpEmail({
      body: { email, name, password }
    });

    // Save instance name if provided
    if (instanceName) {
      await db
        .insert(settings)
        .values({
          key: "instance_name",
          updatedAt: new Date(),
          value: instanceName
        })
        .onConflictDoUpdate({
          set: { updatedAt: new Date(), value: instanceName },
          target: settings.key
        });
    }

    // Return session headers so the user is signed in
    return new Response(
      JSON.stringify({
        data: {
          session: result.session,
          user: { email: result.user.email, id: result.user.id, name: result.user.name }
        }
      }),
      {
        headers: {
          ...Object.fromEntries(result.headers?.entries() ?? []),
          "Content-Type": "application/json"
        },
        status: 200
      }
    );
  });

  return app;
};
```

**Key details:**
- `auth.api.signUpEmail` returns `{ user, session, headers }` — the `headers` contain the `set-cookie` header that creates the session
- We return a raw `Response` (not `c.json`) to preserve the `set-cookie` headers from Better Auth
- The existing database hook at `packages/auth/src/server.ts:44-54` auto-promotes the first user to admin
- The `ConflictError` (409) guards against re-running setup

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/modules/setup/index.ts
git commit -m "feat: add setup API module with status and complete endpoints"
```

---

### Task 3: Register Setup Module in API Entry Point

**Files:**
- Modify: `apps/api/src/index.ts:141-147`

**Context:** The setup module must be registered as a public route (no auth middleware), alongside existing public routes at lines 141-147. The import for `createSetupModule` must be added to the import block.

- [ ] **Step 1: Add import**

Add after the existing module imports (around line 22, near other module imports):

```typescript
import { createSetupModule } from "./modules/setup/index";
```

- [ ] **Step 2: Register route**

Add after the invitations route (line 147) and before the user routes (line 150):

```typescript
// Public setup (no auth required)
app.route("/v1/setup", createSetupModule(db, auth));
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/index.ts
git commit -m "feat: register setup module as public route"
```

---

### Task 4: Setup Wizard — Frontend Page

**Files:**
- Create: `apps/web/src/app/setup/page.tsx`
- Create: `apps/web/src/app/setup/setup-wizard.tsx`

**Context:** Match the split-panel layout from `apps/web/src/app/(auth)/sign-in/sign-in-form.tsx` (branding panel left, form right). Use the same input/button styles. The `api` client is at `apps/web/src/lib/api.ts`. The `signIn` function is at `apps/web/src/lib/auth-client.ts`. The `Button` component is from `@raven/ui`.

- [ ] **Step 1: Create the page component**

```typescript
// apps/web/src/app/setup/page.tsx
import type { Metadata } from "next";
import { SetupWizard } from "./setup-wizard";

export const metadata: Metadata = {
  description: "Set up your Raven instance by creating an admin account.",
  title: "Setup"
};

const SetupPage = () => {
  return <SetupWizard />;
};

export default SetupPage;
```

- [ ] **Step 2: Create the wizard component**

```typescript
// apps/web/src/app/setup/setup-wizard.tsx
"use client";

import { Button } from "@raven/ui";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { api } from "@/lib/api";

interface SetupData {
  email: string;
  instanceName: string;
  name: string;
  password: string;
}

export const SetupWizard = () => {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<SetupData>({
    email: "",
    instanceName: "Raven",
    name: "",
    password: ""
  });

  const updateField = (field: keyof SetupData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setStep(2);
  };

  const handleBack = () => {
    setError("");
    setStep(1);
  };

  const handleComplete = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await api.post("/v1/setup/complete", {
        email: data.email,
        instanceName: data.instanceName || undefined,
        name: data.name,
        password: data.password
      });
      router.push("/overview");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to complete setup"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:flex-1 bg-primary items-center justify-center">
        <div className="text-center">
          <div className="size-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl font-bold text-primary-foreground">
              R
            </span>
          </div>
          <h2 className="text-2xl font-bold text-primary-foreground">Raven</h2>
          <p className="mt-2 text-sm text-primary-foreground/60">
            Unified AI Gateway
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">
                R
              </span>
            </div>
            <span className="text-lg font-semibold">Raven</span>
          </div>

          <div className="mb-6 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className={`flex size-6 items-center justify-center rounded-full text-xs font-medium ${
                  step >= 1
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                1
              </div>
              <span className="text-sm font-medium">Account</span>
            </div>
            <div className="h-px flex-1 bg-border" />
            <div className="flex items-center gap-2">
              <div
                className={`flex size-6 items-center justify-center rounded-full text-xs font-medium ${
                  step >= 2
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                2
              </div>
              <span className="text-sm font-medium">Instance</span>
            </div>
          </div>

          {step === 1 ? (
            <>
              <h1 className="text-2xl font-bold">Create admin account</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                This will be the first administrator of your Raven instance
              </p>

              {error && (
                <div
                  className="mt-4 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive"
                  role="alert"
                >
                  {error}
                </div>
              )}

              <form className="mt-8 space-y-4" onSubmit={handleNext}>
                <div className="space-y-1.5">
                  <label
                    className="block text-sm font-medium"
                    htmlFor="name"
                  >
                    Name
                  </label>
                  <input
                    className="block w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
                    id="name"
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="John Doe"
                    required
                    type="text"
                    value={data.name}
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    className="block text-sm font-medium"
                    htmlFor="email"
                  >
                    Email
                  </label>
                  <input
                    className="block w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
                    id="email"
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="admin@example.com"
                    required
                    type="email"
                    value={data.email}
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    className="block text-sm font-medium"
                    htmlFor="password"
                  >
                    Password
                  </label>
                  <input
                    className="block w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
                    id="password"
                    minLength={8}
                    onChange={(e) => updateField("password", e.target.value)}
                    placeholder="Min. 8 characters"
                    required
                    type="password"
                    value={data.password}
                  />
                </div>
                <Button
                  className="w-full rounded-lg py-2.5"
                  type="submit"
                >
                  Next
                </Button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold">Name your instance</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose a name for your Raven instance
              </p>

              {error && (
                <div
                  className="mt-4 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive"
                  role="alert"
                >
                  {error}
                </div>
              )}

              <form className="mt-8 space-y-4" onSubmit={handleComplete}>
                <div className="space-y-1.5">
                  <label
                    className="block text-sm font-medium"
                    htmlFor="instanceName"
                  >
                    Instance name
                  </label>
                  <input
                    className="block w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
                    id="instanceName"
                    onChange={(e) =>
                      updateField("instanceName", e.target.value)
                    }
                    placeholder="Raven"
                    required
                    type="text"
                    value={data.instanceName}
                  />
                  <p className="text-xs text-muted-foreground">
                    This appears in emails and across the dashboard
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    className="flex-1 rounded-lg py-2.5"
                    onClick={handleBack}
                    type="button"
                    variant="outline"
                  >
                    Back
                  </Button>
                  <Button
                    className="flex-1 rounded-lg py-2.5"
                    disabled={isLoading}
                    type="submit"
                  >
                    {isLoading ? "Setting up..." : "Complete Setup"}
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
```

**Key details:**
- Split-panel layout matches `sign-in-form.tsx` and `sign-up-form.tsx` exactly (same classes, same branding panel)
- Step indicator shows progress (1: Account, 2: Instance)
- Step 1 collects name/email/password with same input styles and validation
- Step 2 collects instance name, pre-filled with "Raven"
- `api.post("/v1/setup/complete", ...)` calls the API — the response sets the session cookie via `set-cookie` header
- On success, redirects to `/overview`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/setup/page.tsx apps/web/src/app/setup/setup-wizard.tsx
git commit -m "feat: add setup wizard frontend with two-step flow"
```

---

### Task 5: Update Middleware for Setup Redirect

**Files:**
- Modify: `apps/web/src/middleware.ts`

**Context:** The current middleware at `apps/web/src/middleware.ts` checks `better-auth.session_token` cookie for auth routing. We need to add setup detection: if no session cookie and visiting an auth/protected route, check `GET /v1/setup/status` to see if setup is needed. The API URL is available via `process.env.NEXT_PUBLIC_API_URL`.

- [ ] **Step 1: Update the middleware**

Replace the entire contents of `apps/web/src/middleware.ts` with:

```typescript
import { type NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "better-auth.session_token";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const AUTH_ROUTES = ["/sign-in", "/sign-up"];

const PROTECTED_PREFIXES = [
  "/analytics",
  "/audit-logs",
  "/budgets",
  "/chat",
  "/guardrails",
  "/integrations",
  "/keys",
  "/models",
  "/overview",
  "/profile",
  "/providers",
  "/requests",
  "/routing",
  "/settings",
  "/webhooks"
];

const checkSetupNeeded = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/v1/setup/status`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(3000)
    });
    if (!response.ok) return false;
    const body = await response.json();
    return body?.data?.needsSetup === true;
  } catch {
    return false;
  }
};

export const middleware = async (
  request: NextRequest
): Promise<NextResponse> => {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  // Session cookie present → setup is definitely done, skip check
  if (hasSession) {
    // Redirect away from /setup if already set up
    if (pathname === "/setup" || pathname.startsWith("/setup/")) {
      return NextResponse.redirect(new URL("/overview", request.url));
    }

    // Root: redirect to dashboard
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/overview", request.url));
    }

    // Redirect authenticated users away from auth routes
    const isAuthRoute = AUTH_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    );
    if (isAuthRoute) {
      return NextResponse.redirect(new URL("/overview", request.url));
    }

    return NextResponse.next();
  }

  // No session cookie — check if setup is needed
  const needsSetup = await checkSetupNeeded();

  // Handle /setup route: allow through only if setup is actually needed
  if (pathname === "/setup" || pathname.startsWith("/setup/")) {
    if (needsSetup) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  if (needsSetup) {
    return NextResponse.redirect(new URL("/setup", request.url));
  }

  // Setup is done but no session — normal auth routing
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
  if (isAuthRoute) {
    return NextResponse.next();
  }

  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
  if (isProtectedRoute) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
};

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"
  ]
};
```

**Key changes from original:**
- Function is now `async` (was sync) to support the `fetch` call
- Added `checkSetupNeeded()` helper with 3-second timeout and graceful fallback
- Session cookie present → skip setup check entirely (short-circuit)
- No session + `/setup` path → check API, allow through only if setup needed, otherwise redirect to `/sign-in`
- No session + any other path → check API, redirect to `/setup` if needed
- If API unreachable, falls through to normal routing (doesn't block the app)

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/middleware.ts
git commit -m "feat: add setup redirect logic to middleware"
```

---

### Task 6: Verify and Clean Up

- [ ] **Step 1: Run the build to verify no TypeScript errors**

```bash
cd /Users/yoginth/raven && pnpm build
```

Expected: Build succeeds with no errors.

- [ ] **Step 2: Run the linter**

```bash
cd /Users/yoginth/raven && pnpm lint
```

Expected: No lint errors in new/modified files. Fix any issues found.

- [ ] **Step 3: Final commit if any lint fixes were needed**

```bash
git add -A
git commit -m "fix: address lint issues in setup module"
```

Only run this step if there were lint fixes.
