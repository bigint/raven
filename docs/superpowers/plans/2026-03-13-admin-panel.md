# Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an MVP site-admin panel accessible only to users with `platform_role = "admin"`, showing platform-wide stats, users, organizations, subscriptions, custom domains, and audit logs.

**Architecture:** Separate `/(admin)/` route group with its own layout and sidebar, independent from the org-scoped dashboard. API routes under `/v1/admin/*` guarded by a platform-admin middleware that checks `user.role === "admin"`. All data is read-only — no mutations in MVP.

**Tech Stack:** Hono (API), Next.js App Router (web), Drizzle ORM, TanStack Query, existing `@raven/ui` components (DataTable, Badge, Spinner).

---

## File Structure

### API (apps/api)

| File | Responsibility |
|------|---------------|
| `src/middleware/platform-admin.ts` | Middleware: reject non-admin users with 403 |
| `src/modules/admin/index.ts` | Route registration for `/v1/admin/*` |
| `src/modules/admin/stats.ts` | `GET /stats` — aggregate counts |
| `src/modules/admin/users.ts` | `GET /users` — all users with org counts |
| `src/modules/admin/organizations.ts` | `GET /organizations` — all orgs with plan + member count |
| `src/modules/admin/domains.ts` | `GET /domains` — all custom domains with org name |
| `src/modules/admin/audit-logs.ts` | `GET /audit-logs` — platform-wide audit logs |
| `src/index.ts` | Wire `/v1/admin` route (modify) |

### Web (apps/web)

| File | Responsibility |
|------|---------------|
| `src/app/(admin)/layout.tsx` | Admin layout with sidebar + auth guard |
| `src/app/(admin)/components/admin-sidebar.tsx` | Admin nav sidebar |
| `src/app/(admin)/admin/page.tsx` | Overview page with stat cards |
| `src/app/(admin)/admin/users/page.tsx` | Users data table |
| `src/app/(admin)/admin/organizations/page.tsx` | Organizations data table |
| `src/app/(admin)/admin/domains/page.tsx` | Custom domains data table |
| `src/app/(admin)/admin/audit-logs/page.tsx` | Audit logs data table |
| `src/app/(admin)/hooks/use-admin.ts` | TanStack Query hooks for all admin endpoints |

---

## Chunk 1: API — Middleware + Admin Module

### Task 1: Platform Admin Middleware

**Files:**
- Create: `apps/api/src/middleware/platform-admin.ts`

- [ ] **Step 1: Create platform-admin middleware**

```typescript
import { createMiddleware } from "hono/factory";
import { ForbiddenError } from "@/lib/errors";

type AuthEnv = {
  Variables: {
    user: { id: string; email: string; name: string; role: string };
    session: { id: string; userId: string };
  };
};

export const platformAdminMiddleware = createMiddleware<AuthEnv>(
  async (c, next) => {
    const user = c.get("user");
    if (user.role !== "admin") {
      throw new ForbiddenError("Platform admin access required");
    }
    await next();
  }
);
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/middleware/platform-admin.ts
git commit -m "feat: add platform admin middleware"
```

### Task 2: Admin Stats Endpoint

**Files:**
- Create: `apps/api/src/modules/admin/stats.ts`

- [ ] **Step 1: Create stats handler**

Returns aggregate counts: total users, total orgs, plan distribution, total requests (last 30d), total cost (last 30d), total custom domains.

```typescript
import type { Database } from "@raven/db";
import {
  customDomains,
  members,
  organizations,
  requestLogs,
  subscriptions,
  users
} from "@raven/db";
import { count, sql, gte, sum } from "drizzle-orm";
import type { Context } from "hono";

export const getAdminStats = (db: Database) => async (c: Context) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    [userCount],
    [orgCount],
    planCounts,
    [requestStats],
    [domainCount]
  ] = await Promise.all([
    db.select({ value: count() }).from(users),
    db.select({ value: count() }).from(organizations),
    db
      .select({
        plan: subscriptions.plan,
        value: count()
      })
      .from(subscriptions)
      .groupBy(subscriptions.plan),
    db
      .select({
        totalCost: sum(requestLogs.cost),
        totalRequests: count()
      })
      .from(requestLogs)
      .where(gte(requestLogs.createdAt, thirtyDaysAgo)),
    db.select({ value: count() }).from(customDomains)
  ]);

  // Count orgs without subscriptions as free
  const freeOrgCount = (orgCount?.value ?? 0) -
    planCounts.reduce((acc, p) => acc + p.value, 0);

  const planDistribution = Object.fromEntries(
    planCounts.map((p) => [p.plan, p.value])
  );
  if (freeOrgCount > 0) {
    planDistribution.free = (planDistribution.free ?? 0) + freeOrgCount;
  }

  return c.json({
    data: {
      totalUsers: userCount?.value ?? 0,
      totalOrgs: orgCount?.value ?? 0,
      planDistribution,
      totalRequests: requestStats?.totalRequests ?? 0,
      totalCost: requestStats?.totalCost ?? "0",
      totalDomains: domainCount?.value ?? 0
    }
  });
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/modules/admin/stats.ts
git commit -m "feat: add admin stats endpoint"
```

### Task 3: Admin Users Endpoint

**Files:**
- Create: `apps/api/src/modules/admin/users.ts`

- [ ] **Step 1: Create users handler**

Returns all users with their org count.

```typescript
import type { Database } from "@raven/db";
import { members, users } from "@raven/db";
import { count, desc, eq, sql } from "drizzle-orm";
import type { Context } from "hono";

export const getAdminUsers = (db: Database) => async (c: Context) => {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      orgCount: count(members.id)
    })
    .from(users)
    .leftJoin(members, eq(members.userId, users.id))
    .groupBy(users.id)
    .orderBy(desc(users.createdAt));

  return c.json({ data: rows });
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/modules/admin/users.ts
git commit -m "feat: add admin users endpoint"
```

### Task 4: Admin Organizations Endpoint

**Files:**
- Create: `apps/api/src/modules/admin/organizations.ts`

- [ ] **Step 1: Create organizations handler**

Returns all orgs with plan and member count.

```typescript
import type { Database } from "@raven/db";
import { members, organizations, subscriptions } from "@raven/db";
import { count, desc, eq } from "drizzle-orm";
import type { Context } from "hono";

export const getAdminOrganizations = (db: Database) => async (c: Context) => {
  const rows = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      createdAt: organizations.createdAt,
      plan: subscriptions.plan,
      memberCount: count(members.id)
    })
    .from(organizations)
    .leftJoin(
      subscriptions,
      eq(subscriptions.organizationId, organizations.id)
    )
    .leftJoin(members, eq(members.organizationId, organizations.id))
    .groupBy(organizations.id, subscriptions.plan)
    .orderBy(desc(organizations.createdAt));

  return c.json({ data: rows });
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/modules/admin/organizations.ts
git commit -m "feat: add admin organizations endpoint"
```

### Task 5: Admin Domains Endpoint

**Files:**
- Create: `apps/api/src/modules/admin/domains.ts`

- [ ] **Step 1: Create domains handler**

Returns all custom domains with org name.

```typescript
import type { Database } from "@raven/db";
import { customDomains, organizations } from "@raven/db";
import { desc, eq } from "drizzle-orm";
import type { Context } from "hono";

export const getAdminDomains = (db: Database) => async (c: Context) => {
  const rows = await db
    .select({
      id: customDomains.id,
      domain: customDomains.domain,
      status: customDomains.status,
      createdAt: customDomains.createdAt,
      verifiedAt: customDomains.verifiedAt,
      orgName: organizations.name,
      orgSlug: organizations.slug
    })
    .from(customDomains)
    .leftJoin(
      organizations,
      eq(organizations.id, customDomains.organizationId)
    )
    .orderBy(desc(customDomains.createdAt));

  return c.json({ data: rows });
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/modules/admin/domains.ts
git commit -m "feat: add admin domains endpoint"
```

### Task 6: Admin Audit Logs Endpoint

**Files:**
- Create: `apps/api/src/modules/admin/audit-logs.ts`

- [ ] **Step 1: Create audit logs handler**

Returns platform-wide audit logs (latest 200) with actor name and org name.

```typescript
import type { Database } from "@raven/db";
import { auditLogs, organizations, users } from "@raven/db";
import { desc, eq } from "drizzle-orm";
import type { Context } from "hono";

export const getAdminAuditLogs = (db: Database) => async (c: Context) => {
  const rows = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      resourceType: auditLogs.resourceType,
      resourceId: auditLogs.resourceId,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt,
      actorName: users.name,
      actorEmail: users.email,
      orgName: organizations.name
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorId))
    .leftJoin(
      organizations,
      eq(organizations.id, auditLogs.organizationId)
    )
    .orderBy(desc(auditLogs.createdAt))
    .limit(200);

  return c.json({ data: rows });
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/modules/admin/audit-logs.ts
git commit -m "feat: add admin audit logs endpoint"
```

### Task 7: Admin Module Index + Wire Routes

**Files:**
- Create: `apps/api/src/modules/admin/index.ts`
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: Create admin module index**

```typescript
import type { Database } from "@raven/db";
import { Hono } from "hono";
import { getAdminAuditLogs } from "./audit-logs";
import { getAdminDomains } from "./domains";
import { getAdminOrganizations } from "./organizations";
import { getAdminStats } from "./stats";
import { getAdminUsers } from "./users";

export const createAdminModule = (db: Database) => {
  const app = new Hono();
  app.get("/stats", getAdminStats(db));
  app.get("/users", getAdminUsers(db));
  app.get("/organizations", getAdminOrganizations(db));
  app.get("/domains", getAdminDomains(db));
  app.get("/audit-logs", getAdminAuditLogs(db));
  return app;
};
```

- [ ] **Step 2: Wire admin routes in index.ts**

In `apps/api/src/index.ts`, add after the user-level routes block (after line 97):

```typescript
import { createAdminModule } from "./modules/admin/index";
import { platformAdminMiddleware } from "./middleware/platform-admin";

// Admin routes (session auth + platform admin check)
const adminRoutes = new Hono();
adminRoutes.use("*", createAuthMiddleware(auth));
adminRoutes.use("*", platformAdminMiddleware);
adminRoutes.route("/", createAdminModule(db));
app.route("/v1/admin", adminRoutes);
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/admin/index.ts apps/api/src/index.ts
git commit -m "feat: wire admin API module with platform admin guard"
```

---

## Chunk 2: Web — Admin Layout + Pages

### Task 8: Admin TanStack Query Hooks

**Files:**
- Create: `apps/web/src/app/(admin)/hooks/use-admin.ts`

- [ ] **Step 1: Create admin hooks**

```typescript
"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Note: admin endpoints don't need X-Org-Id header — the api helper
// already handles the case where no org is active.

export interface AdminStats {
  totalUsers: number;
  totalOrgs: number;
  planDistribution: Record<string, number>;
  totalRequests: number;
  totalCost: string;
  totalDomains: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  orgCount: number;
}

export interface AdminOrg {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  plan: string | null;
  memberCount: number;
}

export interface AdminDomain {
  id: string;
  domain: string;
  status: string;
  createdAt: string;
  verifiedAt: string | null;
  orgName: string;
  orgSlug: string;
}

export interface AdminAuditLog {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actorName: string;
  actorEmail: string;
  orgName: string;
}

export const adminStatsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<AdminStats>("/v1/admin/stats"),
    queryKey: ["admin", "stats"]
  });

export const adminUsersQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<AdminUser[]>("/v1/admin/users"),
    queryKey: ["admin", "users"]
  });

export const adminOrgsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<AdminOrg[]>("/v1/admin/organizations"),
    queryKey: ["admin", "organizations"]
  });

export const adminDomainsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<AdminDomain[]>("/v1/admin/domains"),
    queryKey: ["admin", "domains"]
  });

export const adminAuditLogsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<AdminAuditLog[]>("/v1/admin/audit-logs"),
    queryKey: ["admin", "audit-logs"]
  });

export const useAdminStats = () => useQuery(adminStatsQueryOptions());
export const useAdminUsers = () => useQuery(adminUsersQueryOptions());
export const useAdminOrgs = () => useQuery(adminOrgsQueryOptions());
export const useAdminDomains = () => useQuery(adminDomainsQueryOptions());
export const useAdminAuditLogs = () => useQuery(adminAuditLogsQueryOptions());
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/\(admin\)/hooks/use-admin.ts
git commit -m "feat: add admin panel TanStack Query hooks"
```

### Task 9: Admin Sidebar

**Files:**
- Create: `apps/web/src/app/(admin)/components/admin-sidebar.tsx`

- [ ] **Step 1: Create admin sidebar**

Minimal sidebar with admin nav items: Overview, Users, Organizations, Domains, Audit Logs. Include a "Back to Dashboard" link.

```typescript
"use client";

import {
  ArrowLeft,
  Building2,
  Globe,
  LayoutDashboard,
  ScrollText,
  Users
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin", icon: LayoutDashboard, label: "Overview" },
  { href: "/admin/users", icon: Users, label: "Users" },
  { href: "/admin/organizations", icon: Building2, label: "Organizations" },
  { href: "/admin/domains", icon: Globe, label: "Domains" },
  { href: "/admin/audit-logs", icon: ScrollText, label: "Audit Logs" }
];

export const AdminSidebar = () => {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-60 border-r border-border bg-muted/50 flex-col shrink-0">
      <div className="border-b border-border px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-red-500 flex items-center justify-center">
            <span className="text-xs font-bold text-white">R</span>
          </div>
          <span className="font-semibold text-sm">Admin Panel</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
              href={item.href}
              key={item.href}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-3 py-3">
        <Link
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          href="/overview"
        >
          <ArrowLeft className="size-4" />
          Back to Dashboard
        </Link>
      </div>
    </aside>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/\(admin\)/components/admin-sidebar.tsx
git commit -m "feat: add admin panel sidebar"
```

### Task 10: Admin Layout

**Files:**
- Create: `apps/web/src/app/(admin)/layout.tsx`

- [ ] **Step 1: Create admin layout**

Guard: check session exists + user.role === "admin". Redirect non-admins to `/`.

```typescript
"use client";

import { motion } from "motion/react";
import { redirect, usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useSession } from "@/lib/auth-client";
import { AdminSidebar } from "./components/admin-sidebar";

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    redirect("/sign-in");
  }

  if (session.user.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden md:flex-row">
      <AdminSidebar />
      <main className="flex-1 overflow-auto overscroll-contain">
        <motion.div
          animate={{ opacity: 1 }}
          className="px-4 py-4 md:px-8 md:py-6"
          initial={{ opacity: 0 }}
          key={pathname}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
};

export default AdminLayout;
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/\(admin\)/layout.tsx
git commit -m "feat: add admin layout with auth guard"
```

### Task 11: Admin Overview Page

**Files:**
- Create: `apps/web/src/app/(admin)/admin/page.tsx`

- [ ] **Step 1: Create overview page with stat cards**

Show: total users, total orgs, total requests (30d), total cost (30d), total domains, plan distribution.

```typescript
"use client";

import { Badge } from "@raven/ui";
import {
  Activity,
  Building2,
  DollarSign,
  Globe,
  Users
} from "lucide-react";
import { TextMorph } from "torph/react";
import { useAdminStats } from "../hooks/use-admin";

const AdminOverviewPage = () => {
  const { data: stats, isPending } = useAdminStats();

  const cards = [
    {
      bg: "bg-blue-500/10",
      color: "text-blue-500",
      icon: Users,
      label: "Total Users",
      value: stats?.totalUsers.toLocaleString() ?? "0"
    },
    {
      bg: "bg-purple-500/10",
      color: "text-purple-500",
      icon: Building2,
      label: "Organizations",
      value: stats?.totalOrgs.toLocaleString() ?? "0"
    },
    {
      bg: "bg-green-500/10",
      color: "text-green-500",
      icon: Activity,
      label: "Requests (30d)",
      value: stats?.totalRequests.toLocaleString() ?? "0"
    },
    {
      bg: "bg-yellow-500/10",
      color: "text-yellow-500",
      icon: DollarSign,
      label: "Cost (30d)",
      value: `$${Number(stats?.totalCost ?? 0).toFixed(2)}`
    },
    {
      bg: "bg-orange-500/10",
      color: "text-orange-500",
      icon: Globe,
      label: "Custom Domains",
      value: stats?.totalDomains.toLocaleString() ?? "0"
    }
  ];

  const planDistribution = stats?.planDistribution ?? {};

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-bold sm:text-2xl">Admin Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform-wide statistics and insights.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              className="rounded-xl border border-border p-5"
              key={card.label}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <div className={`rounded-lg p-2 ${card.bg}`}>
                  <Icon className={`size-4 ${card.color}`} />
                </div>
              </div>
              <div className="mt-3">
                {isPending ? (
                  <div className="h-7 w-20 animate-pulse rounded-md bg-muted" />
                ) : (
                  <TextMorph className="text-2xl font-bold tabular-nums">
                    {card.value}
                  </TextMorph>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {Object.keys(planDistribution).length > 0 && (
        <div className="mt-8 rounded-xl border border-border p-5">
          <h2 className="mb-4 text-sm font-semibold">Plan Distribution</h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(planDistribution).map(([plan, count]) => (
              <div
                className="flex items-center gap-2 rounded-lg border border-border px-4 py-2"
                key={plan}
              >
                <Badge variant="primary">{plan}</Badge>
                <span className="text-lg font-semibold tabular-nums">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOverviewPage;
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/\(admin\)/admin/page.tsx
git commit -m "feat: add admin overview page"
```

### Task 12: Admin Users Page

**Files:**
- Create: `apps/web/src/app/(admin)/admin/users/page.tsx`

- [ ] **Step 1: Create users page**

DataTable showing all users: name, email, role, org count, joined date.

```typescript
"use client";

import { Badge, DataTable } from "@raven/ui";
import type { Column } from "@raven/ui";
import { Users } from "lucide-react";
import type { AdminUser } from "../../hooks/use-admin";
import { useAdminUsers } from "../../hooks/use-admin";

const columns: Column<AdminUser>[] = [
  {
    header: "Name",
    key: "name",
    render: (u) => <span className="font-medium">{u.name}</span>
  },
  {
    header: "Email",
    key: "email",
    render: (u) => (
      <span className="text-muted-foreground">{u.email}</span>
    )
  },
  {
    header: "Role",
    key: "role",
    render: (u) => (
      <Badge variant={u.role === "admin" ? "error" : "neutral"}>
        {u.role}
      </Badge>
    )
  },
  {
    header: "Orgs",
    key: "orgCount",
    render: (u) => <span className="tabular-nums">{u.orgCount}</span>
  },
  {
    header: "Joined",
    key: "createdAt",
    render: (u) => (
      <span className="text-muted-foreground">
        {new Date(u.createdAt).toLocaleDateString()}
      </span>
    )
  }
];

const AdminUsersPage = () => {
  const { data: users = [], isPending } = useAdminUsers();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-bold sm:text-2xl">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All registered platform users.
        </p>
      </div>
      <DataTable
        columns={columns}
        data={users}
        emptyIcon={<Users className="size-8 text-muted-foreground" />}
        emptyTitle="No users yet"
        keyExtractor={(u) => u.id}
        loading={isPending}
      />
    </div>
  );
};

export default AdminUsersPage;
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/\(admin\)/admin/users/page.tsx
git commit -m "feat: add admin users page"
```

### Task 13: Admin Organizations Page

**Files:**
- Create: `apps/web/src/app/(admin)/admin/organizations/page.tsx`

- [ ] **Step 1: Create organizations page**

DataTable showing all orgs: name, slug, plan, members, created date.

```typescript
"use client";

import { Badge, DataTable } from "@raven/ui";
import type { Column } from "@raven/ui";
import { Building2 } from "lucide-react";
import type { AdminOrg } from "../../hooks/use-admin";
import { useAdminOrgs } from "../../hooks/use-admin";

const PLAN_VARIANT: Record<string, "success" | "warning" | "error" | "neutral" | "primary"> = {
  enterprise: "error",
  free: "neutral",
  pro: "primary",
  team: "success"
};

const columns: Column<AdminOrg>[] = [
  {
    header: "Name",
    key: "name",
    render: (o) => <span className="font-medium">{o.name}</span>
  },
  {
    header: "Slug",
    key: "slug",
    render: (o) => (
      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
        {o.slug}
      </code>
    )
  },
  {
    header: "Plan",
    key: "plan",
    render: (o) => {
      const plan = o.plan ?? "free";
      return (
        <Badge variant={PLAN_VARIANT[plan] ?? "neutral"}>{plan}</Badge>
      );
    }
  },
  {
    header: "Members",
    key: "memberCount",
    render: (o) => <span className="tabular-nums">{o.memberCount}</span>
  },
  {
    header: "Created",
    key: "createdAt",
    render: (o) => (
      <span className="text-muted-foreground">
        {new Date(o.createdAt).toLocaleDateString()}
      </span>
    )
  }
];

const AdminOrganizationsPage = () => {
  const { data: orgs = [], isPending } = useAdminOrgs();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-bold sm:text-2xl">Organizations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All organizations on the platform.
        </p>
      </div>
      <DataTable
        columns={columns}
        data={orgs}
        emptyIcon={<Building2 className="size-8 text-muted-foreground" />}
        emptyTitle="No organizations yet"
        keyExtractor={(o) => o.id}
        loading={isPending}
      />
    </div>
  );
};

export default AdminOrganizationsPage;
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/\(admin\)/admin/organizations/page.tsx
git commit -m "feat: add admin organizations page"
```

### Task 14: Admin Domains Page

**Files:**
- Create: `apps/web/src/app/(admin)/admin/domains/page.tsx`

- [ ] **Step 1: Create domains page**

DataTable showing all custom domains: domain, status, org, created, verified.

```typescript
"use client";

import { Badge, DataTable } from "@raven/ui";
import type { Column } from "@raven/ui";
import { Globe } from "lucide-react";
import type { AdminDomain } from "../../hooks/use-admin";
import { useAdminDomains } from "../../hooks/use-admin";

const STATUS_VARIANT: Record<string, "success" | "warning" | "error" | "neutral"> = {
  active: "success",
  failed: "error",
  pending_verification: "warning",
  verified: "neutral"
};

const columns: Column<AdminDomain>[] = [
  {
    header: "Domain",
    key: "domain",
    render: (d) => <span className="font-medium">{d.domain}</span>
  },
  {
    header: "Status",
    key: "status",
    render: (d) => (
      <Badge dot variant={STATUS_VARIANT[d.status] ?? "neutral"}>
        {d.status.replace("_", " ")}
      </Badge>
    )
  },
  {
    header: "Organization",
    key: "orgName",
    render: (d) => (
      <span className="text-muted-foreground">{d.orgName}</span>
    )
  },
  {
    header: "Created",
    key: "createdAt",
    render: (d) => (
      <span className="text-muted-foreground">
        {new Date(d.createdAt).toLocaleDateString()}
      </span>
    )
  },
  {
    header: "Verified",
    key: "verifiedAt",
    render: (d) => (
      <span className="text-muted-foreground">
        {d.verifiedAt
          ? new Date(d.verifiedAt).toLocaleDateString()
          : "—"}
      </span>
    )
  }
];

const AdminDomainsPage = () => {
  const { data: domains = [], isPending } = useAdminDomains();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-bold sm:text-2xl">Custom Domains</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All custom domains across organizations.
        </p>
      </div>
      <DataTable
        columns={columns}
        data={domains}
        emptyIcon={<Globe className="size-8 text-muted-foreground" />}
        emptyTitle="No custom domains"
        keyExtractor={(d) => d.id}
        loading={isPending}
      />
    </div>
  );
};

export default AdminDomainsPage;
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/\(admin\)/admin/domains/page.tsx
git commit -m "feat: add admin domains page"
```

### Task 15: Admin Audit Logs Page

**Files:**
- Create: `apps/web/src/app/(admin)/admin/audit-logs/page.tsx`

- [ ] **Step 1: Create audit logs page**

DataTable showing platform-wide audit logs: action, resource, actor, org, time.

```typescript
"use client";

import { DataTable } from "@raven/ui";
import type { Column } from "@raven/ui";
import { ScrollText } from "lucide-react";
import type { AdminAuditLog } from "../../hooks/use-admin";
import { useAdminAuditLogs } from "../../hooks/use-admin";

const columns: Column<AdminAuditLog>[] = [
  {
    header: "Action",
    key: "action",
    render: (l) => (
      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
        {l.action}
      </code>
    )
  },
  {
    header: "Resource",
    key: "resource",
    render: (l) => (
      <span className="text-muted-foreground">
        {l.resourceType}
      </span>
    )
  },
  {
    header: "Actor",
    key: "actor",
    render: (l) => (
      <div>
        <p className="text-sm font-medium">{l.actorName}</p>
        <p className="text-xs text-muted-foreground">{l.actorEmail}</p>
      </div>
    )
  },
  {
    header: "Organization",
    key: "orgName",
    render: (l) => (
      <span className="text-muted-foreground">{l.orgName}</span>
    )
  },
  {
    header: "Time",
    key: "createdAt",
    render: (l) => (
      <span className="text-muted-foreground">
        {new Date(l.createdAt).toLocaleString()}
      </span>
    )
  }
];

const AdminAuditLogsPage = () => {
  const { data: logs = [], isPending } = useAdminAuditLogs();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-bold sm:text-2xl">Audit Logs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform-wide activity log (latest 200).
        </p>
      </div>
      <DataTable
        columns={columns}
        data={logs}
        emptyIcon={<ScrollText className="size-8 text-muted-foreground" />}
        emptyTitle="No audit logs"
        keyExtractor={(l) => l.id}
        loading={isPending}
      />
    </div>
  );
};

export default AdminAuditLogsPage;
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/\(admin\)/admin/audit-logs/page.tsx
git commit -m "feat: add admin audit logs page"
```

### Task 16: Add Admin Link to Dashboard

**Files:**
- Modify: `apps/web/src/app/(dashboard)/components/user-menu.tsx`

- [ ] **Step 1: Add admin panel link to user menu for admins**

In the user menu component, add an "Admin Panel" link that only shows when the user's platform role is `"admin"`. The `UserMenu` component needs to accept `role` from the session user and render a link to `/admin` when role is admin.

Add before the Settings link in the menu:

```typescript
{user.role === "admin" && (
  <Link
    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    href="/admin"
    onClick={() => setOpen(false)}
  >
    <ShieldCheck className="size-4" />
    Admin Panel
  </Link>
)}
```

Update the `UserMenuProps` interface to include `role`:
```typescript
interface UserMenuProps {
  user: { name?: string | null; email?: string | null; role?: string };
}
```

Import `ShieldCheck` from lucide-react.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/components/user-menu.tsx
git commit -m "feat: add admin panel link in user menu for platform admins"
```
