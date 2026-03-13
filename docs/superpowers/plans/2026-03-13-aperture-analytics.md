# Aperture-Inspired Analytics Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a comprehensive analytics suite inspired by Tailscale Aperture with Logs (session-grouped), Tool Use, Adoption, and Models pages — plus stacked bar charts and a request detail slide-over panel.

**Architecture:** Add new analytics pages alongside existing ones. Enhance backend with new aggregation endpoints. Use Recharts for stacked bar charts. Virtual Keys serve as the "User" equivalent from Aperture. Sessions group requests for expandable log views.

**Tech Stack:** React 19, TypeScript, Next.js 15 App Router, Hono (API), TanStack Query v5, Drizzle ORM, Recharts, Tailwind CSS 4, Lucide Icons

---

## Context: Aperture → Raven Feature Mapping

| Aperture Concept | Raven Equivalent | Notes |
|---|---|---|
| User | Virtual Key | API keys identify callers |
| User Agent | `userAgent` field | New column needed on `request_logs` |
| Session | `sessionId` field | Already exists |
| Tool Use | `hasToolUse` / `toolCount` | Already tracked per request |
| Tool Breakdown | Not stored per-tool | Show aggregate tool counts only |
| Models | `model` field | Already tracked per request |

## File Structure

### Schema & Migrations
- Modify: `packages/db/src/schema/request-logs.ts` — add `userAgent` column
- Create: `packages/db/drizzle/0004_add_user_agent.sql`
- Modify: `packages/db/drizzle/meta/_journal.json` — register migration

### Backend API (new handlers)
- Create: `apps/api/src/modules/analytics/logs.ts` — sessions grouped by key with token/model aggregation
- Create: `apps/api/src/modules/analytics/tools.ts` — tool usage aggregation (daily + per-session)
- Create: `apps/api/src/modules/analytics/adoption.ts` — per-key usage breakdown + daily token chart data
- Create: `apps/api/src/modules/analytics/models.ts` — per-model analytics
- Modify: `apps/api/src/modules/analytics/index.ts` — register new routes
- Modify: `apps/api/src/modules/analytics/schema.ts` — add new query schemas
- Modify: `apps/api/src/modules/analytics/sessions.ts` — enrich with token columns + models + key name + userAgent

### Frontend — Logs Page (replaces existing Requests page concept)
- Create: `apps/web/src/app/(dashboard)/logs/page.tsx`
- Create: `apps/web/src/app/(dashboard)/logs/hooks/use-logs.ts`
- Create: `apps/web/src/app/(dashboard)/logs/components/logs-table.tsx` — session rows with expand
- Create: `apps/web/src/app/(dashboard)/logs/components/logs-filters.tsx`
- Create: `apps/web/src/app/(dashboard)/logs/components/session-row.tsx` — expandable session with child requests
- Create: `apps/web/src/app/(dashboard)/logs/components/request-detail.tsx` — slide-over panel

### Frontend — Tool Use Page
- Create: `apps/web/src/app/(dashboard)/tools/page.tsx`
- Create: `apps/web/src/app/(dashboard)/tools/hooks/use-tools.ts`
- Create: `apps/web/src/app/(dashboard)/tools/components/tool-chart.tsx` — daily stacked bar
- Create: `apps/web/src/app/(dashboard)/tools/components/tool-sessions-table.tsx`

### Frontend — Adoption Page
- Create: `apps/web/src/app/(dashboard)/adoption/page.tsx`
- Create: `apps/web/src/app/(dashboard)/adoption/hooks/use-adoption.ts`
- Create: `apps/web/src/app/(dashboard)/adoption/components/token-chart.tsx` — daily stacked bar (Cached/Input/Output/Reasoning)
- Create: `apps/web/src/app/(dashboard)/adoption/components/usage-table.tsx` — per-key breakdown
- Create: `apps/web/src/app/(dashboard)/adoption/components/usage-bars.tsx` — horizontal bar chart per key

### Frontend — Models Page
- Create: `apps/web/src/app/(dashboard)/models/page.tsx`
- Create: `apps/web/src/app/(dashboard)/models/hooks/use-models.ts`
- Create: `apps/web/src/app/(dashboard)/models/components/models-table.tsx`

### Navigation
- Modify: `apps/web/src/app/(dashboard)/components/sidebar.tsx` — add Logs, Tools, Adoption, Models nav items

### Dependencies
- Modify: `apps/web/package.json` — add `recharts`

---

## Chunk 1: Schema, Dependencies & Backend

### Task 1: Install Recharts

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: Install recharts**

```bash
cd apps/web && pnpm add recharts
```

- [ ] **Step 2: Verify install**

```bash
pnpm ls recharts
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "chore: add recharts dependency"
```

### Task 2: Add userAgent column to request_logs

**Files:**
- Modify: `packages/db/src/schema/request-logs.ts`
- Create: `packages/db/drizzle/0004_add_user_agent.sql`
- Modify: `packages/db/drizzle/meta/_journal.json`

- [ ] **Step 1: Add userAgent field to schema**

In `packages/db/src/schema/request-logs.ts`, add after `toolCount`:

```typescript
userAgent: text("user_agent"),
```

Note: nullable since existing rows won't have it.

- [ ] **Step 2: Create migration**

Create `packages/db/drizzle/0004_add_user_agent.sql`:

```sql
ALTER TABLE "request_logs" ADD COLUMN "user_agent" text;
```

- [ ] **Step 3: Update journal**

Add entry to `packages/db/drizzle/meta/_journal.json` entries array:

```json
{
  "idx": 4,
  "version": "7",
  "when": 1773800000000,
  "tag": "0004_add_user_agent",
  "breakpoints": true
}
```

- [ ] **Step 4: Run typecheck**

```bash
cd packages/db && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add packages/db/
git commit -m "feat: add userAgent column to request_logs"
```

### Task 3: Backend — Logs endpoint (enhanced sessions)

**Files:**
- Create: `apps/api/src/modules/analytics/logs.ts`
- Modify: `apps/api/src/modules/analytics/schema.ts`
- Modify: `apps/api/src/modules/analytics/index.ts`

- [ ] **Step 1: Add logsQuerySchema**

In `apps/api/src/modules/analytics/schema.ts`, add:

```typescript
export const logsQuerySchema = z.object({
  from: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  model: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  to: z.string().optional(),
  virtualKeyId: z.string().optional()
});
```

- [ ] **Step 2: Create logs handler**

Create `apps/api/src/modules/analytics/logs.ts`:

```typescript
import type { Database } from "@raven/db";
import { requestLogs, virtualKeys } from "@raven/db";
import { and, count, eq, isNotNull, max, min, sql, sum } from "drizzle-orm";
import type { z } from "zod";
import type { AppContextWithQuery } from "@/lib/types";

import { parseDateRange } from "./helpers";
import type { logsQuerySchema } from "./schema";

type Query = z.infer<typeof logsQuerySchema>;

export const getLogs =
  (db: Database) => async (c: AppContextWithQuery<Query>) => {
    const orgId = c.get("orgId");
    const query = c.req.valid("query");

    const { limit, page } = query;
    const offset = (page - 1) * limit;

    const dateConditions = parseDateRange(query.from, query.to);

    const filterConditions = [
      eq(requestLogs.organizationId, orgId),
      isNotNull(requestLogs.sessionId),
      ...dateConditions
    ];

    if (query.virtualKeyId) {
      filterConditions.push(eq(requestLogs.virtualKeyId, query.virtualKeyId));
    }

    if (query.model) {
      filterConditions.push(eq(requestLogs.model, query.model));
    }

    const where = and(...filterConditions);

    const [rows, countResult] = await Promise.all([
      db
        .select({
          cachedTokens: sum(requestLogs.cachedTokens).as("cached_tokens_sum"),
          endTime: max(requestLogs.createdAt).as("end_time"),
          inputTokens: sum(requestLogs.inputTokens).as("input_tokens_sum"),
          keyName: virtualKeys.name,
          models:
            sql<string>`string_agg(DISTINCT ${requestLogs.model}, ',')`.as(
              "models"
            ),
          outputTokens: sum(requestLogs.outputTokens).as("output_tokens_sum"),
          reasoningTokens: sum(requestLogs.reasoningTokens).as(
            "reasoning_tokens_sum"
          ),
          requestCount: count().as("request_count"),
          sessionId: requestLogs.sessionId,
          startTime: min(requestLogs.createdAt).as("start_time"),
          toolUses: sum(requestLogs.toolCount).as("tool_uses"),
          userAgent:
            sql<string>`(array_agg(${requestLogs.userAgent} ORDER BY ${requestLogs.createdAt} DESC))[1]`.as(
              "user_agent"
            ),
          virtualKeyId: requestLogs.virtualKeyId
        })
        .from(requestLogs)
        .leftJoin(virtualKeys, eq(requestLogs.virtualKeyId, virtualKeys.id))
        .where(where)
        .groupBy(requestLogs.sessionId, requestLogs.virtualKeyId, virtualKeys.name)
        .orderBy(sql`end_time DESC`)
        .limit(limit)
        .offset(offset),
      db
        .select({
          total: sql<number>`count(DISTINCT ${requestLogs.sessionId})`.as(
            "total"
          )
        })
        .from(requestLogs)
        .where(where)
    ]);

    const total = countResult[0]?.total ?? 0;

    return c.json({
      data: rows.map((row) => ({
        cachedTokens: Number(row.cachedTokens ?? 0),
        endTime: row.endTime,
        inputTokens: Number(row.inputTokens ?? 0),
        keyName: row.keyName ?? "Unknown",
        models: row.models ? row.models.split(",") : [],
        outputTokens: Number(row.outputTokens ?? 0),
        reasoningTokens: Number(row.reasoningTokens ?? 0),
        requestCount: Number(row.requestCount),
        sessionId: row.sessionId,
        startTime: row.startTime,
        toolUses: Number(row.toolUses ?? 0),
        userAgent: row.userAgent ?? null,
        virtualKeyId: row.virtualKeyId
      })),
      pagination: {
        limit,
        page,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit)
      }
    });
  };
```

- [ ] **Step 3: Register route**

In `apps/api/src/modules/analytics/index.ts`, import `getLogs` and `logsQuerySchema`, add:

```typescript
app.get("/logs", queryValidator(logsQuerySchema), getLogs(db));
```

- [ ] **Step 4: Run typecheck**

```bash
cd apps/api && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/analytics/
git commit -m "feat: add logs endpoint with session-grouped data"
```

### Task 4: Backend — Tools endpoint

**Files:**
- Create: `apps/api/src/modules/analytics/tools.ts`
- Modify: `apps/api/src/modules/analytics/index.ts`

- [ ] **Step 1: Create tools handler**

Create `apps/api/src/modules/analytics/tools.ts` with two exports:

1. `getToolStats` — daily tool usage counts (for the stacked bar chart)
2. `getToolSessions` — sessions that have tool usage, with breakdown

```typescript
import type { Database } from "@raven/db";
import { requestLogs, virtualKeys } from "@raven/db";
import {
  and,
  count,
  eq,
  gt,
  isNotNull,
  max,
  min,
  sql,
  sum
} from "drizzle-orm";
import type { z } from "zod";
import type { AppContextWithQuery } from "@/lib/types";

import { parseDateRange } from "./helpers";
import type { dateRangeQuerySchema, logsQuerySchema } from "./schema";

type DateQuery = z.infer<typeof dateRangeQuerySchema>;
type PagedQuery = z.infer<typeof logsQuerySchema>;

export const getToolStats =
  (db: Database) => async (c: AppContextWithQuery<DateQuery>) => {
    const orgId = c.get("orgId");
    const { from, to } = c.req.valid("query");

    const dateConditions = parseDateRange(from, to);
    const where = and(
      eq(requestLogs.organizationId, orgId),
      gt(requestLogs.toolCount, 0),
      ...dateConditions
    );

    const rows = await db
      .select({
        date: sql<string>`DATE(${requestLogs.createdAt})`.as("date"),
        totalRequests: count().as("total_requests"),
        totalToolUses: sum(requestLogs.toolCount).as("total_tool_uses")
      })
      .from(requestLogs)
      .where(where)
      .groupBy(sql`DATE(${requestLogs.createdAt})`)
      .orderBy(sql`DATE(${requestLogs.createdAt})`);

    return c.json({
      data: rows.map((row) => ({
        date: row.date,
        totalRequests: Number(row.totalRequests),
        totalToolUses: Number(row.totalToolUses ?? 0)
      }))
    });
  };

export const getToolSessions =
  (db: Database) => async (c: AppContextWithQuery<PagedQuery>) => {
    const orgId = c.get("orgId");
    const query = c.req.valid("query");

    const { limit, page } = query;
    const offset = (page - 1) * limit;

    const dateConditions = parseDateRange(query.from, query.to);

    const where = and(
      eq(requestLogs.organizationId, orgId),
      isNotNull(requestLogs.sessionId),
      ...dateConditions
    );

    // Subquery: only sessions with tool use
    const [rows, countResult] = await Promise.all([
      db
        .select({
          endTime: max(requestLogs.createdAt).as("end_time"),
          keyName: virtualKeys.name,
          models:
            sql<string>`string_agg(DISTINCT ${requestLogs.model}, ',')`.as(
              "models"
            ),
          requestCount: count().as("request_count"),
          sessionId: requestLogs.sessionId,
          toolUses: sum(requestLogs.toolCount).as("tool_uses"),
          userAgent:
            sql<string>`(array_agg(${requestLogs.userAgent} ORDER BY ${requestLogs.createdAt} DESC))[1]`.as(
              "user_agent"
            ),
          virtualKeyId: requestLogs.virtualKeyId
        })
        .from(requestLogs)
        .leftJoin(virtualKeys, eq(requestLogs.virtualKeyId, virtualKeys.id))
        .where(where)
        .groupBy(requestLogs.sessionId, requestLogs.virtualKeyId, virtualKeys.name)
        .having(sql`SUM(${requestLogs.toolCount}) > 0`)
        .orderBy(sql`end_time DESC`)
        .limit(limit)
        .offset(offset),
      db
        .select({
          total:
            sql<number>`count(DISTINCT ${requestLogs.sessionId}) FILTER (WHERE ${requestLogs.toolCount} > 0)`.as(
              "total"
            )
        })
        .from(requestLogs)
        .where(where)
    ]);

    const total = countResult[0]?.total ?? 0;

    return c.json({
      data: rows.map((row) => ({
        endTime: row.endTime,
        keyName: row.keyName ?? "Unknown",
        models: row.models ? row.models.split(",") : [],
        requestCount: Number(row.requestCount),
        sessionId: row.sessionId,
        toolUses: Number(row.toolUses ?? 0),
        userAgent: row.userAgent ?? null,
        virtualKeyId: row.virtualKeyId
      })),
      pagination: {
        limit,
        page,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit)
      }
    });
  };
```

- [ ] **Step 2: Register routes**

In `apps/api/src/modules/analytics/index.ts`, add:

```typescript
import { getToolStats, getToolSessions } from "./tools";

app.get("/tools/stats", queryValidator(dateRangeQuerySchema), getToolStats(db));
app.get("/tools/sessions", queryValidator(logsQuerySchema), getToolSessions(db));
```

- [ ] **Step 3: Run typecheck**

```bash
cd apps/api && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/analytics/
git commit -m "feat: add tool use analytics endpoints"
```

### Task 5: Backend — Adoption endpoint

**Files:**
- Create: `apps/api/src/modules/analytics/adoption.ts`
- Modify: `apps/api/src/modules/analytics/index.ts`
- Modify: `apps/api/src/modules/analytics/schema.ts`

- [ ] **Step 1: Add adoptionQuerySchema**

In `schema.ts`, add:

```typescript
export const adoptionQuerySchema = z.object({
  from: z.string().optional(),
  groupBy: z.enum(["key", "model"]).default("key"),
  to: z.string().optional()
});
```

- [ ] **Step 2: Create adoption handler**

Create `apps/api/src/modules/analytics/adoption.ts`:

```typescript
import type { Database } from "@raven/db";
import { requestLogs, virtualKeys } from "@raven/db";
import { and, count, eq, sql, sum } from "drizzle-orm";
import type { z } from "zod";
import type { AppContextWithQuery } from "@/lib/types";

import { parseDateRange } from "./helpers";
import type { adoptionQuerySchema, dateRangeQuerySchema } from "./schema";

type DateQuery = z.infer<typeof dateRangeQuerySchema>;
type AdoptionQuery = z.infer<typeof adoptionQuerySchema>;

/** Daily token breakdown for stacked chart */
export const getAdoptionChart =
  (db: Database) => async (c: AppContextWithQuery<DateQuery>) => {
    const orgId = c.get("orgId");
    const { from, to } = c.req.valid("query");

    const dateConditions = parseDateRange(from, to);
    const where = and(eq(requestLogs.organizationId, orgId), ...dateConditions);

    const rows = await db
      .select({
        cached: sum(requestLogs.cachedTokens).as("cached"),
        date: sql<string>`DATE(${requestLogs.createdAt})`.as("date"),
        input: sum(requestLogs.inputTokens).as("input"),
        output: sum(requestLogs.outputTokens).as("output"),
        reasoning: sum(requestLogs.reasoningTokens).as("reasoning")
      })
      .from(requestLogs)
      .where(where)
      .groupBy(sql`DATE(${requestLogs.createdAt})`)
      .orderBy(sql`DATE(${requestLogs.createdAt})`);

    return c.json({
      data: rows.map((row) => ({
        cached: Number(row.cached ?? 0),
        date: row.date,
        input: Number(row.input ?? 0),
        output: Number(row.output ?? 0),
        reasoning: Number(row.reasoning ?? 0)
      }))
    });
  };

/** Per-key or per-model usage breakdown */
export const getAdoptionBreakdown =
  (db: Database) => async (c: AppContextWithQuery<AdoptionQuery>) => {
    const orgId = c.get("orgId");
    const { from, to, groupBy } = c.req.valid("query");

    const dateConditions = parseDateRange(from, to);
    const where = and(eq(requestLogs.organizationId, orgId), ...dateConditions);

    if (groupBy === "model") {
      const rows = await db
        .select({
          cachedTokens: sum(requestLogs.cachedTokens),
          inputTokens: sum(requestLogs.inputTokens),
          label: requestLogs.model,
          outputTokens: sum(requestLogs.outputTokens),
          reasoningTokens: sum(requestLogs.reasoningTokens),
          requests: count()
        })
        .from(requestLogs)
        .where(where)
        .groupBy(requestLogs.model)
        .orderBy(sql`${sum(requestLogs.inputTokens)} DESC`);

      return c.json({
        data: rows.map((row) => ({
          cachedTokens: Number(row.cachedTokens ?? 0),
          inputTokens: Number(row.inputTokens ?? 0),
          label: row.label,
          outputTokens: Number(row.outputTokens ?? 0),
          reasoningTokens: Number(row.reasoningTokens ?? 0),
          requests: Number(row.requests)
        }))
      });
    }

    // Default: group by virtual key
    const rows = await db
      .select({
        cachedTokens: sum(requestLogs.cachedTokens),
        inputTokens: sum(requestLogs.inputTokens),
        label: virtualKeys.name,
        outputTokens: sum(requestLogs.outputTokens),
        reasoningTokens: sum(requestLogs.reasoningTokens),
        requests: count()
      })
      .from(requestLogs)
      .leftJoin(virtualKeys, eq(requestLogs.virtualKeyId, virtualKeys.id))
      .where(where)
      .groupBy(virtualKeys.name)
      .orderBy(sql`${sum(requestLogs.inputTokens)} DESC`);

    return c.json({
      data: rows.map((row) => ({
        cachedTokens: Number(row.cachedTokens ?? 0),
        inputTokens: Number(row.inputTokens ?? 0),
        label: row.label ?? "Unknown",
        outputTokens: Number(row.outputTokens ?? 0),
        reasoningTokens: Number(row.reasoningTokens ?? 0),
        requests: Number(row.requests)
      }))
    });
  };
```

- [ ] **Step 3: Register routes**

```typescript
import { getAdoptionChart, getAdoptionBreakdown } from "./adoption";
import { adoptionQuerySchema } from "./schema";

app.get("/adoption/chart", queryValidator(dateRangeQuerySchema), getAdoptionChart(db));
app.get("/adoption/breakdown", queryValidator(adoptionQuerySchema), getAdoptionBreakdown(db));
```

- [ ] **Step 4: Run typecheck**

```bash
cd apps/api && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/analytics/
git commit -m "feat: add adoption analytics endpoints"
```

### Task 6: Backend — Models endpoint

**Files:**
- Create: `apps/api/src/modules/analytics/models.ts`
- Modify: `apps/api/src/modules/analytics/index.ts`

- [ ] **Step 1: Create models handler**

Create `apps/api/src/modules/analytics/models.ts`:

```typescript
import type { Database } from "@raven/db";
import { requestLogs } from "@raven/db";
import { and, avg, count, eq, max, sql, sum } from "drizzle-orm";
import type { z } from "zod";
import type { AppContextWithQuery } from "@/lib/types";

import { parseDateRange } from "./helpers";
import type { dateRangeQuerySchema } from "./schema";

type Query = z.infer<typeof dateRangeQuerySchema>;

export const getModels =
  (db: Database) => async (c: AppContextWithQuery<Query>) => {
    const orgId = c.get("orgId");
    const { from, to } = c.req.valid("query");

    const dateConditions = parseDateRange(from, to);
    const where = and(eq(requestLogs.organizationId, orgId), ...dateConditions);

    const rows = await db
      .select({
        avgLatencyMs: avg(requestLogs.latencyMs),
        cachedTokens: sum(requestLogs.cachedTokens),
        inputTokens: sum(requestLogs.inputTokens),
        lastUsed: max(requestLogs.createdAt),
        model: requestLogs.model,
        outputTokens: sum(requestLogs.outputTokens),
        provider: requestLogs.provider,
        reasoningTokens: sum(requestLogs.reasoningTokens),
        requests: count(),
        totalCost: sum(requestLogs.cost)
      })
      .from(requestLogs)
      .where(where)
      .groupBy(requestLogs.model, requestLogs.provider)
      .orderBy(sql`${count()} DESC`);

    return c.json({
      data: rows.map((row) => ({
        avgLatencyMs: Number(row.avgLatencyMs ?? 0),
        cachedTokens: Number(row.cachedTokens ?? 0),
        inputTokens: Number(row.inputTokens ?? 0),
        lastUsed: row.lastUsed,
        model: row.model,
        outputTokens: Number(row.outputTokens ?? 0),
        provider: row.provider,
        reasoningTokens: Number(row.reasoningTokens ?? 0),
        requests: Number(row.requests),
        totalCost: row.totalCost ?? "0"
      }))
    });
  };
```

- [ ] **Step 2: Register route**

```typescript
import { getModels } from "./models";

app.get("/models", queryValidator(dateRangeQuerySchema), getModels(db));
```

- [ ] **Step 3: Run typecheck, commit**

```bash
cd apps/api && npx tsc --noEmit
git add apps/api/src/modules/analytics/
git commit -m "feat: add models analytics endpoint"
```

### Task 7: Enrich existing session detail endpoint

**Files:**
- Modify: `apps/api/src/modules/analytics/sessions.ts`

- [ ] **Step 1: Add token fields to getSessionById select**

The `getSessionById` handler currently returns `select()` (all fields). It already returns everything including `inputTokens`, `outputTokens`, `cachedTokens`, `reasoningTokens`, `toolCount`, `method`, `path`, `latencyMs`, `statusCode`, `userAgent`. This is already sufficient for the request detail panel. No changes needed.

- [ ] **Step 2: Add token fields to getSessions aggregation**

Update the `getSessions` handler select to include:

```typescript
totalCachedTokens: sum(requestLogs.cachedTokens).as("total_cached_tokens"),
totalReasoningTokens: sum(requestLogs.reasoningTokens).as("total_reasoning_tokens"),
totalToolUses: sum(requestLogs.toolCount).as("total_tool_uses"),
models: sql<string>`string_agg(DISTINCT ${requestLogs.model}, ',')`.as("models"),
```

And add to the response map:

```typescript
totalCachedTokens: Number(row.totalCachedTokens ?? 0),
totalReasoningTokens: Number(row.totalReasoningTokens ?? 0),
totalToolUses: Number(row.totalToolUses ?? 0),
models: row.models ? row.models.split(",") : [],
```

- [ ] **Step 3: Run typecheck, commit**

```bash
cd apps/api && npx tsc --noEmit
git add apps/api/src/modules/analytics/sessions.ts
git commit -m "feat: enrich sessions endpoint with token and tool data"
```

---

## Chunk 2: Navigation & Logs Page

### Task 8: Update sidebar navigation

**Files:**
- Modify: `apps/web/src/app/(dashboard)/components/sidebar.tsx`

- [ ] **Step 1: Add new nav items**

Add imports: `Wrench, BarChart2, Cpu, ScrollText` (reuse ScrollText for Logs).

Update `NAV_ITEMS` — replace the Requests entry and add new ones. The new order should be:

```typescript
{ href: "/overview", icon: LayoutDashboard, label: "Overview" },
{ href: "/providers", icon: Network, label: "Providers" },
{ href: "/keys", icon: Key, label: "Keys" },
{ href: "/prompts", icon: FileText, label: "Prompts" },
{ href: "/analytics", icon: BarChart3, label: "Analytics" },
{ href: "/logs", icon: ScrollText, label: "Logs" },
{ href: "/tools", icon: Wrench, label: "Tool Use" },
{ href: "/adoption", icon: TrendingUp, label: "Adoption" },
{ href: "/models", icon: Cpu, label: "Models" },
{ href: "/routing", icon: Route, label: "Routing" },
{ href: "/requests", icon: Activity, label: "Requests" },
{ href: "/budgets", icon: CreditCard, label: "Budgets" },
{ href: "/guardrails", icon: Shield, label: "Guardrails" },
{ href: "/team", icon: Users, label: "Team" },
{ href: "/billing", icon: Receipt, label: "Billing" },
{ href: "/webhooks", icon: Webhook, label: "Webhooks" },
```

- [ ] **Step 2: Run typecheck, commit**

```bash
cd apps/web && npx tsc --noEmit
git add apps/web/src/app/\(dashboard\)/components/sidebar.tsx
git commit -m "feat: add logs, tools, adoption, models to sidebar nav"
```

### Task 9: Logs page — hook

**Files:**
- Create: `apps/web/src/app/(dashboard)/logs/hooks/use-logs.ts`

- [ ] **Step 1: Create the hook**

```typescript
"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

export interface LogSession {
  sessionId: string;
  virtualKeyId: string;
  keyName: string;
  userAgent: string | null;
  requestCount: number;
  models: string[];
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  reasoningTokens: number;
  toolUses: number;
  startTime: string;
  endTime: string;
}

export interface SessionRequest {
  id: string;
  createdAt: string;
  provider: string;
  model: string;
  statusCode: number;
  latencyMs: number;
  cost: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  reasoningTokens: number;
  cacheHit: boolean;
  method: string;
  path: string;
  toolCount: number;
  sessionId: string | null;
  userAgent: string | null;
  virtualKeyId: string;
}

interface LogsResponse {
  data: LogSession[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type DateRange = "7d" | "30d" | "90d";

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" }
];

const RANGE_MS: Record<DateRange, number> = {
  "7d": 604_800_000,
  "30d": 2_592_000_000,
  "90d": 7_776_000_000
};

const VALID_RANGES: DateRange[] = ["7d", "30d", "90d"];

const rangeToFrom = (range: DateRange): string =>
  new Date(Date.now() - RANGE_MS[range]).toISOString();

const PAGE_SIZE = 20;

export const logsQueryOptions = (range: DateRange, page: number) =>
  queryOptions({
    queryFn: () =>
      api.get<LogsResponse>(
        `/v1/analytics/logs?from=${rangeToFrom(range)}&page=${page}&limit=${PAGE_SIZE}`
      ),
    queryKey: ["logs", range, page]
  });

export const sessionDetailQueryOptions = (sessionId: string) =>
  queryOptions({
    enabled: !!sessionId,
    queryFn: () =>
      api.get<{ data: SessionRequest[] }>(
        `/v1/analytics/sessions/${sessionId}`
      ),
    queryKey: ["session", sessionId]
  });

export const useLogs = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const rangeParam = searchParams.get("range") as DateRange | null;
  const dateRange =
    rangeParam && VALID_RANGES.includes(rangeParam) ? rangeParam : "30d";

  const pageParam = searchParams.get("page");
  const page = pageParam ? Math.max(1, Number.parseInt(pageParam, 10)) : 1;

  const setDateRange = (range: DateRange) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", range);
    params.delete("page");
    router.replace(`?${params.toString()}`);
  };

  const setPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.replace(`?${params.toString()}`);
  };

  const query = useQuery(logsQueryOptions(dateRange, page));

  return {
    data: query.data?.data ?? [],
    dateRange,
    dateRangeOptions: DATE_RANGE_OPTIONS,
    error: query.error?.message ?? null,
    isLoading: query.isPending,
    page,
    pagination: query.data?.pagination ?? null,
    setDateRange,
    setPage
  };
};
```

- [ ] **Step 2: Run typecheck**

```bash
cd apps/web && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/logs/
git commit -m "feat: add logs hook with session queries"
```

### Task 10: Logs page — session row component

**Files:**
- Create: `apps/web/src/app/(dashboard)/logs/components/session-row.tsx`

- [ ] **Step 1: Create expandable session row**

This component renders a table row for a session with a chevron to expand/collapse showing child requests.

```typescript
"use client";

import { Badge } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, MessageSquare, Wrench } from "lucide-react";
import { useState } from "react";
import type { LogSession } from "../hooks/use-logs";
import { sessionDetailQueryOptions } from "../hooks/use-logs";

interface SessionRowProps {
  session: LogSession;
  onRequestClick: (requestId: string, sessionId: string) => void;
}

const formatTimeAgo = (ts: string): string => {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const getStatusBadge = (statusCode: number) => {
  const variant =
    statusCode >= 500
      ? "error"
      : statusCode >= 400
        ? "warning"
        : statusCode >= 200 && statusCode < 300
          ? "success"
          : "neutral";
  return <Badge variant={variant}>{statusCode}</Badge>;
};

export const SessionRow = ({ session, onRequestClick }: SessionRowProps) => {
  const [expanded, setExpanded] = useState(false);

  const { data: detail } = useQuery({
    ...sessionDetailQueryOptions(session.sessionId ?? ""),
    enabled: expanded && !!session.sessionId
  });

  const requests = detail?.data ?? [];

  return (
    <>
      <tr
        className="cursor-pointer border-b border-border transition-colors hover:bg-muted/30"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-5 py-4">
          <ChevronRight
            className={`size-4 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`}
          />
        </td>
        <td className="px-5 py-4 font-medium text-primary">
          {session.keyName}
        </td>
        <td className="px-5 py-4 text-sm text-muted-foreground">
          {session.userAgent ?? "\u2014"}
        </td>
        <td className="px-5 py-4 text-right tabular-nums">
          <span className="inline-flex items-center gap-1.5">
            {session.requestCount.toLocaleString()}
            <MessageSquare className="size-3.5 text-muted-foreground" />
          </span>
        </td>
        <td className="px-5 py-4 text-sm">
          {session.models.map((m) => (
            <div className="whitespace-nowrap" key={m}>
              {m}
            </div>
          ))}
        </td>
        <td className="px-5 py-4 text-right tabular-nums">
          {session.inputTokens.toLocaleString()}
        </td>
        <td className="px-5 py-4 text-right tabular-nums">
          {session.outputTokens.toLocaleString()}
        </td>
        <td className="px-5 py-4 text-right tabular-nums">
          {session.cachedTokens.toLocaleString()}
        </td>
        <td className="px-5 py-4 text-right tabular-nums">
          {session.reasoningTokens.toLocaleString()}
        </td>
        <td className="px-5 py-4 text-right tabular-nums">
          <span className="inline-flex items-center gap-1.5">
            {session.toolUses.toLocaleString()}
            <Wrench className="size-3.5 text-muted-foreground" />
          </span>
        </td>
        <td className="px-5 py-4 text-right text-sm text-muted-foreground whitespace-nowrap">
          {formatTimeAgo(session.endTime)}
        </td>
      </tr>

      {expanded && (
        <tr>
          <td className="bg-muted/20 px-0 py-0" colSpan={11}>
            <div className="px-8 py-4">
              {requests.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Loading requests...
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Time
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Model
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Status
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Latency
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Input
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Output
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Cost
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((req) => (
                      <tr
                        className="cursor-pointer border-b border-border/30 transition-colors hover:bg-muted/30"
                        key={req.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onRequestClick(req.id, session.sessionId ?? "");
                        }}
                      >
                        <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(req.createdAt).toLocaleString(undefined, {
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            month: "short",
                            second: "2-digit"
                          })}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs">
                          {req.model}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {getStatusBadge(req.statusCode)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {req.latencyMs.toLocaleString()}ms
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {req.inputTokens.toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {req.outputTokens.toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          ${Number(req.cost).toFixed(6)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};
```

- [ ] **Step 2: Run typecheck, commit**

```bash
cd apps/web && npx tsc --noEmit
git add apps/web/src/app/\(dashboard\)/logs/
git commit -m "feat: add expandable session row component"
```

### Task 11: Logs page — request detail slide-over

**Files:**
- Create: `apps/web/src/app/(dashboard)/logs/components/request-detail.tsx`

- [ ] **Step 1: Create the slide-over panel**

This is a right-side slide-over panel showing request details when clicking a request in the expanded session view. Displays: Metric Information (all fields), Request Metadata (path, method, status), Token details.

```typescript
"use client";

import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import type { SessionRequest } from "../hooks/use-logs";

interface RequestDetailProps {
  request: SessionRequest | null;
  onClose: () => void;
}

const Field = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="mt-0.5 text-sm font-medium">{value}</p>
  </div>
);

export const RequestDetail = ({ request, onClose }: RequestDetailProps) => (
  <AnimatePresence>
    {request && (
      <>
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-40 bg-black/30"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onClick={onClose}
        />
        <motion.div
          animate={{ x: 0 }}
          className="fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto border-l border-border bg-background shadow-xl"
          exit={{ x: "100%" }}
          initial={{ x: "100%" }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-6 py-4">
            <div>
              <h2 className="text-base font-semibold">Request Details</h2>
              <p className="text-xs text-muted-foreground">
                ID: {request.id}
              </p>
            </div>
            <button
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              onClick={onClose}
              type="button"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Metric Information */}
          <div className="border-b border-border px-6 py-5">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Metric Information
            </h3>
            <div className="grid grid-cols-3 gap-x-6 gap-y-4">
              <Field label="Session ID" value={request.sessionId ?? "\u2014"} />
              <Field
                label="Timestamp"
                value={new Date(request.createdAt).toLocaleString()}
              />
              <Field label="Model" value={request.model} />
              <Field
                label="Duration"
                value={`${request.latencyMs.toLocaleString()} ms`}
              />
              <Field
                label="Input Tokens"
                value={request.inputTokens.toLocaleString()}
              />
              <Field
                label="Output Tokens"
                value={request.outputTokens.toLocaleString()}
              />
              <Field
                label="Cache Tokens"
                value={request.cachedTokens.toLocaleString()}
              />
              <Field
                label="Reasoning Tokens"
                value={request.reasoningTokens.toLocaleString()}
              />
              <Field
                label="Cost"
                value={`$${Number(request.cost).toFixed(6)}`}
              />
            </div>
          </div>

          {/* Request Metadata */}
          <div className="border-b border-border px-6 py-5">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Request Metadata
            </h3>
            <div className="grid grid-cols-3 gap-x-6 gap-y-4">
              <Field label="Method" value={request.method} />
              <Field label="Path" value={request.path} />
              <Field label="Status Code" value={String(request.statusCode)} />
              <Field label="Provider" value={request.provider} />
              <Field
                label="Cache Hit"
                value={request.cacheHit ? "Yes" : "No"}
              />
              <Field
                label="Tools Used"
                value={String(request.toolCount)}
              />
            </div>
          </div>

          {/* Tool Use */}
          <div className="px-6 py-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Tool Use
              </h3>
              <span className="text-xs text-muted-foreground">
                Tools Called: {request.toolCount}
              </span>
            </div>
            {request.toolCount === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No tool usage recorded.
              </p>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                {request.toolCount} tool call{request.toolCount !== 1 ? "s" : ""} in this request.
              </p>
            )}
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);
```

- [ ] **Step 2: Run typecheck, commit**

```bash
cd apps/web && npx tsc --noEmit
git add apps/web/src/app/\(dashboard\)/logs/
git commit -m "feat: add request detail slide-over panel"
```

### Task 12: Logs page — filters & table

**Files:**
- Create: `apps/web/src/app/(dashboard)/logs/components/logs-filters.tsx`
- Create: `apps/web/src/app/(dashboard)/logs/components/logs-table.tsx`

- [ ] **Step 1: Create logs filters**

```typescript
"use client";

import type { DateRange } from "../hooks/use-logs";

interface LogsFiltersProps {
  dateRange: DateRange;
  dateRangeOptions: { value: DateRange; label: string }[];
  onDateRangeChange: (range: DateRange) => void;
}

export const LogsFilters = ({
  dateRange,
  dateRangeOptions,
  onDateRangeChange
}: LogsFiltersProps) => (
  <div className="mb-6 flex items-center gap-1 overflow-x-auto rounded-lg border border-border p-1 w-fit">
    {dateRangeOptions.map((opt) => (
      <button
        className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          dateRange === opt.value
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
        key={opt.value}
        onClick={() => onDateRangeChange(opt.value)}
        type="button"
      >
        {opt.label}
      </button>
    ))}
  </div>
);
```

- [ ] **Step 2: Create logs table**

```typescript
"use client";

import { Button, Spinner } from "@raven/ui";
import { ChevronLeft, ChevronRight, ScrollText } from "lucide-react";
import type { LogSession } from "../hooks/use-logs";
import { SessionRow } from "./session-row";

interface LogsTableProps {
  data: LogSession[];
  loading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onRequestClick: (requestId: string, sessionId: string) => void;
}

const TABLE_HEADERS = [
  { className: "w-10", label: "" },
  { className: "text-left", label: "Key" },
  { className: "text-left", label: "User Agent" },
  { className: "text-right", label: "Requests" },
  { className: "text-left", label: "Models" },
  { className: "text-right", label: "Input Tokens" },
  { className: "text-right", label: "Output Tokens" },
  { className: "text-right", label: "Cached" },
  { className: "text-right", label: "Reasoning" },
  { className: "text-right", label: "Tool Uses" },
  { className: "text-right", label: "Last Activity" }
];

export const LogsTable = ({
  data,
  loading,
  page,
  totalPages,
  onPageChange,
  onRequestClick
}: LogsTableProps) => {
  if (loading) {
    return (
      <div className="rounded-xl border border-border p-12 text-center">
        <Spinner className="mx-auto" />
        <p className="mt-3 text-sm text-muted-foreground">
          Loading sessions...
        </p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border p-12 text-center">
        <ScrollText className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">
          No sessions found for the selected period.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {TABLE_HEADERS.map((h) => (
                <th
                  className={`px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground ${h.className}`}
                  key={h.label || "expand"}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((session) => (
              <SessionRow
                key={session.sessionId}
                onRequestClick={onRequestClick}
                session={session}
              />
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              disabled={page === 1}
              onClick={() => onPageChange(Math.max(1, page - 1))}
              size="sm"
              variant="secondary"
            >
              <ChevronLeft className="size-4" />
              Prev
            </Button>
            <Button
              disabled={page === totalPages}
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              size="sm"
              variant="secondary"
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
```

- [ ] **Step 3: Run typecheck, commit**

```bash
cd apps/web && npx tsc --noEmit
git add apps/web/src/app/\(dashboard\)/logs/
git commit -m "feat: add logs filters and table components"
```

### Task 13: Logs page — main page component

**Files:**
- Create: `apps/web/src/app/(dashboard)/logs/page.tsx`

- [ ] **Step 1: Create the page**

```typescript
"use client";

import { PageHeader } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { LogsFilters } from "./components/logs-filters";
import { LogsTable } from "./components/logs-table";
import { RequestDetail } from "./components/request-detail";
import {
  type SessionRequest,
  sessionDetailQueryOptions,
  useLogs
} from "./hooks/use-logs";

const LogsPage = () => {
  const {
    data,
    dateRange,
    dateRangeOptions,
    error,
    isLoading,
    page,
    pagination,
    setDateRange,
    setPage
  } = useLogs();

  const [selectedRequest, setSelectedRequest] =
    useState<SessionRequest | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string>("");

  const { data: sessionDetail } = useQuery({
    ...sessionDetailQueryOptions(activeSessionId),
    enabled: !!activeSessionId
  });

  const handleRequestClick = (requestId: string, sessionId: string) => {
    setActiveSessionId(sessionId);
    const requests = sessionDetail?.data ?? [];
    const req = requests.find((r) => r.id === requestId);
    if (req) {
      setSelectedRequest(req);
    }
  };

  return (
    <div>
      <PageHeader
        description="View and monitor LLM request sessions. Expand a session to see individual requests."
        title="Logs"
      />

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <LogsFilters
        dateRange={dateRange}
        dateRangeOptions={dateRangeOptions}
        onDateRangeChange={setDateRange}
      />

      <LogsTable
        data={data}
        loading={isLoading}
        onPageChange={setPage}
        onRequestClick={handleRequestClick}
        page={page}
        totalPages={pagination?.totalPages ?? 1}
      />

      <RequestDetail
        onClose={() => setSelectedRequest(null)}
        request={selectedRequest}
      />
    </div>
  );
};

export default LogsPage;
```

- [ ] **Step 2: Run typecheck, commit**

```bash
cd apps/web && npx tsc --noEmit
git add apps/web/src/app/\(dashboard\)/logs/
git commit -m "feat: add logs page with session view and request detail panel"
```

---

## Chunk 3: Tool Use & Adoption Pages

### Task 14: Tool Use page — hook

**Files:**
- Create: `apps/web/src/app/(dashboard)/tools/hooks/use-tools.ts`

- [ ] **Step 1: Create the hook**

```typescript
"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

export interface ToolDailyStats {
  date: string;
  totalRequests: number;
  totalToolUses: number;
}

export interface ToolSession {
  sessionId: string;
  virtualKeyId: string;
  keyName: string;
  userAgent: string | null;
  requestCount: number;
  models: string[];
  toolUses: number;
  endTime: string;
}

interface ToolSessionsResponse {
  data: ToolSession[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type DateRange = "7d" | "30d" | "90d";

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" }
];

const VALID_RANGES: DateRange[] = ["7d", "30d", "90d"];

const RANGE_MS: Record<DateRange, number> = {
  "7d": 604_800_000,
  "30d": 2_592_000_000,
  "90d": 7_776_000_000
};

const rangeToFrom = (range: DateRange): string =>
  new Date(Date.now() - RANGE_MS[range]).toISOString();

export const toolStatsQueryOptions = (range: DateRange) =>
  queryOptions({
    queryFn: () =>
      api.get<{ data: ToolDailyStats[] }>(
        `/v1/analytics/tools/stats?from=${rangeToFrom(range)}`
      ),
    queryKey: ["tools", "stats", range]
  });

export const toolSessionsQueryOptions = (range: DateRange, page: number) =>
  queryOptions({
    queryFn: () =>
      api.get<ToolSessionsResponse>(
        `/v1/analytics/tools/sessions?from=${rangeToFrom(range)}&page=${page}&limit=20`
      ),
    queryKey: ["tools", "sessions", range, page]
  });

export const useTools = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const rangeParam = searchParams.get("range") as DateRange | null;
  const dateRange =
    rangeParam && VALID_RANGES.includes(rangeParam) ? rangeParam : "30d";

  const pageParam = searchParams.get("page");
  const page = pageParam ? Math.max(1, Number.parseInt(pageParam, 10)) : 1;

  const setDateRange = (range: DateRange) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", range);
    params.delete("page");
    router.replace(`?${params.toString()}`);
  };

  const setPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.replace(`?${params.toString()}`);
  };

  const statsQuery = useQuery(toolStatsQueryOptions(dateRange));
  const sessionsQuery = useQuery(toolSessionsQueryOptions(dateRange, page));

  return {
    chartData: statsQuery.data?.data ?? [],
    dateRange,
    dateRangeOptions: DATE_RANGE_OPTIONS,
    error:
      statsQuery.error?.message ?? sessionsQuery.error?.message ?? null,
    isLoading: statsQuery.isPending || sessionsQuery.isPending,
    page,
    pagination: sessionsQuery.data?.pagination ?? null,
    sessions: sessionsQuery.data?.data ?? [],
    setDateRange,
    setPage
  };
};
```

- [ ] **Step 2: Run typecheck, commit**

```bash
cd apps/web && npx tsc --noEmit
git add apps/web/src/app/\(dashboard\)/tools/
git commit -m "feat: add tool use hook"
```

### Task 15: Tool Use page — chart component

**Files:**
- Create: `apps/web/src/app/(dashboard)/tools/components/tool-chart.tsx`

- [ ] **Step 1: Create stacked bar chart**

```typescript
"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { ToolDailyStats } from "../hooks/use-tools";

interface ToolChartProps {
  data: ToolDailyStats[];
}

const formatDate = (date: string): string => {
  const d = new Date(date);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

export const ToolChart = ({ data }: ToolChartProps) => {
  if (data.length === 0) return null;

  return (
    <div className="mb-8 rounded-xl border border-border p-5">
      <ResponsiveContainer height={300} width="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
          <XAxis
            axisLine={false}
            dataKey="date"
            fontSize={12}
            tick={{ fill: "var(--color-muted-foreground)" }}
            tickFormatter={formatDate}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            fontSize={12}
            tick={{ fill: "var(--color-muted-foreground)" }}
            tickLine={false}
            width={50}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-background)",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
              fontSize: "12px"
            }}
            labelFormatter={formatDate}
          />
          <Bar
            dataKey="totalToolUses"
            fill="#3b82f6"
            name="Tool Uses"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
```

- [ ] **Step 2: Run typecheck, commit**

```bash
cd apps/web && npx tsc --noEmit
git add apps/web/src/app/\(dashboard\)/tools/
git commit -m "feat: add tool use chart component"
```

### Task 16: Tool Use page — sessions table & page

**Files:**
- Create: `apps/web/src/app/(dashboard)/tools/components/tool-sessions-table.tsx`
- Create: `apps/web/src/app/(dashboard)/tools/page.tsx`

- [ ] **Step 1: Create tool sessions table**

Shows sessions with tool usage: Key, User Agent, Requests, Models, Tool Uses, Last Activity.

```typescript
"use client";

import { Button, Spinner } from "@raven/ui";
import { ChevronLeft, ChevronRight, MessageSquare, Wrench } from "lucide-react";
import type { ToolSession } from "../hooks/use-tools";

interface ToolSessionsTableProps {
  sessions: ToolSession[];
  loading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const ToolSessionsTable = ({
  sessions,
  loading,
  page,
  totalPages,
  onPageChange
}: ToolSessionsTableProps) => {
  if (loading) {
    return (
      <div className="rounded-xl border border-border p-12 text-center">
        <Spinner className="mx-auto" />
        <p className="mt-3 text-sm text-muted-foreground">Loading sessions...</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="rounded-xl border border-border p-12 text-center">
        <Wrench className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">
          No sessions with tool usage found.
        </p>
      </div>
    );
  }

  const formatTimeAgo = (ts: string): string => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Key
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                User Agent
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Requests
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Models
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Tool Uses
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Last Activity
              </th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s, idx) => (
              <tr
                className={`transition-colors hover:bg-muted/30 ${idx !== sessions.length - 1 ? "border-b border-border" : ""}`}
                key={s.sessionId}
              >
                <td className="px-5 py-4 font-medium text-primary">
                  {s.keyName}
                </td>
                <td className="px-5 py-4 text-sm text-muted-foreground">
                  {s.userAgent ?? "\u2014"}
                </td>
                <td className="px-5 py-4 text-right tabular-nums">
                  <span className="inline-flex items-center gap-1.5">
                    {s.requestCount.toLocaleString()}
                    <MessageSquare className="size-3.5 text-muted-foreground" />
                  </span>
                </td>
                <td className="px-5 py-4 text-sm">
                  {s.models.map((m) => (
                    <div className="whitespace-nowrap" key={m}>{m}</div>
                  ))}
                </td>
                <td className="px-5 py-4 text-right tabular-nums">
                  <span className="inline-flex items-center gap-1.5">
                    {s.toolUses.toLocaleString()}
                    <Wrench className="size-3.5 text-muted-foreground" />
                  </span>
                </td>
                <td className="px-5 py-4 text-right text-sm text-muted-foreground whitespace-nowrap">
                  {formatTimeAgo(s.endTime)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              disabled={page === 1}
              onClick={() => onPageChange(Math.max(1, page - 1))}
              size="sm"
              variant="secondary"
            >
              <ChevronLeft className="size-4" />
              Prev
            </Button>
            <Button
              disabled={page === totalPages}
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              size="sm"
              variant="secondary"
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
```

- [ ] **Step 2: Create Tool Use page**

```typescript
"use client";

import { PageHeader } from "@raven/ui";
import { ToolChart } from "./components/tool-chart";
import { ToolSessionsTable } from "./components/tool-sessions-table";
import { useTools } from "./hooks/use-tools";

const ToolsPage = () => {
  const {
    chartData,
    dateRange,
    dateRangeOptions,
    error,
    isLoading,
    page,
    pagination,
    sessions,
    setDateRange,
    setPage
  } = useTools();

  return (
    <div>
      <PageHeader
        description="Sessions with tool use activity. View tool call breakdowns by type for each session."
        title="Tool Use"
      />

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mb-6 flex items-center gap-1 overflow-x-auto rounded-lg border border-border p-1 w-fit">
        {dateRangeOptions.map((opt) => (
          <button
            className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              dateRange === opt.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            key={opt.value}
            onClick={() => setDateRange(opt.value)}
            type="button"
          >
            {opt.label}
          </button>
        ))}
      </div>

      <ToolChart data={chartData} />

      <ToolSessionsTable
        loading={isLoading}
        onPageChange={setPage}
        page={page}
        sessions={sessions}
        totalPages={pagination?.totalPages ?? 1}
      />
    </div>
  );
};

export default ToolsPage;
```

- [ ] **Step 3: Run typecheck, commit**

```bash
cd apps/web && npx tsc --noEmit
git add apps/web/src/app/\(dashboard\)/tools/
git commit -m "feat: add tool use page with chart and sessions table"
```

### Task 17: Adoption page — hook

**Files:**
- Create: `apps/web/src/app/(dashboard)/adoption/hooks/use-adoption.ts`

- [ ] **Step 1: Create the hook**

```typescript
"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

export interface ChartDataPoint {
  date: string;
  cached: number;
  input: number;
  output: number;
  reasoning: number;
}

export interface BreakdownRow {
  label: string;
  cachedTokens: number;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  requests: number;
}

export type DateRange = "7d" | "30d" | "90d";
export type GroupBy = "key" | "model";

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" }
];

const GROUP_BY_OPTIONS: { value: GroupBy; label: string }[] = [
  { label: "Keys", value: "key" },
  { label: "Models", value: "model" }
];

const VALID_RANGES: DateRange[] = ["7d", "30d", "90d"];

const RANGE_MS: Record<DateRange, number> = {
  "7d": 604_800_000,
  "30d": 2_592_000_000,
  "90d": 7_776_000_000
};

const rangeToFrom = (range: DateRange): string =>
  new Date(Date.now() - RANGE_MS[range]).toISOString();

export const adoptionChartQueryOptions = (range: DateRange) =>
  queryOptions({
    queryFn: () =>
      api.get<{ data: ChartDataPoint[] }>(
        `/v1/analytics/adoption/chart?from=${rangeToFrom(range)}`
      ),
    queryKey: ["adoption", "chart", range]
  });

export const adoptionBreakdownQueryOptions = (
  range: DateRange,
  groupBy: GroupBy
) =>
  queryOptions({
    queryFn: () =>
      api.get<{ data: BreakdownRow[] }>(
        `/v1/analytics/adoption/breakdown?from=${rangeToFrom(range)}&groupBy=${groupBy}`
      ),
    queryKey: ["adoption", "breakdown", range, groupBy]
  });

export const useAdoption = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const rangeParam = searchParams.get("range") as DateRange | null;
  const dateRange =
    rangeParam && VALID_RANGES.includes(rangeParam) ? rangeParam : "30d";

  const groupByParam = searchParams.get("groupBy") as GroupBy | null;
  const groupBy =
    groupByParam === "key" || groupByParam === "model"
      ? groupByParam
      : "key";

  const setDateRange = (range: DateRange) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", range);
    router.replace(`?${params.toString()}`);
  };

  const setGroupBy = (gb: GroupBy) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("groupBy", gb);
    router.replace(`?${params.toString()}`);
  };

  const chartQuery = useQuery(adoptionChartQueryOptions(dateRange));
  const breakdownQuery = useQuery(
    adoptionBreakdownQueryOptions(dateRange, groupBy)
  );

  return {
    breakdownData: breakdownQuery.data?.data ?? [],
    chartData: chartQuery.data?.data ?? [],
    dateRange,
    dateRangeOptions: DATE_RANGE_OPTIONS,
    error:
      chartQuery.error?.message ?? breakdownQuery.error?.message ?? null,
    groupBy,
    groupByOptions: GROUP_BY_OPTIONS,
    isLoading: chartQuery.isPending || breakdownQuery.isPending,
    setDateRange,
    setGroupBy
  };
};
```

- [ ] **Step 2: Run typecheck, commit**

```bash
cd apps/web && npx tsc --noEmit
git add apps/web/src/app/\(dashboard\)/adoption/
git commit -m "feat: add adoption hook"
```

### Task 18: Adoption page — token chart

**Files:**
- Create: `apps/web/src/app/(dashboard)/adoption/components/token-chart.tsx`

- [ ] **Step 1: Create stacked bar chart for tokens**

```typescript
"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { ChartDataPoint } from "../hooks/use-adoption";

interface TokenChartProps {
  data: ChartDataPoint[];
}

const formatDate = (date: string): string => {
  const d = new Date(date);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

const formatNumber = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

export const TokenChart = ({ data }: TokenChartProps) => {
  if (data.length === 0) return null;

  return (
    <div className="mb-8 rounded-xl border border-border p-5">
      <ResponsiveContainer height={300} width="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
          <XAxis
            axisLine={false}
            dataKey="date"
            fontSize={12}
            tick={{ fill: "var(--color-muted-foreground)" }}
            tickFormatter={formatDate}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            fontSize={12}
            tick={{ fill: "var(--color-muted-foreground)" }}
            tickFormatter={formatNumber}
            tickLine={false}
            width={60}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-background)",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
              fontSize: "12px"
            }}
            formatter={(value: number) => value.toLocaleString()}
            labelFormatter={formatDate}
          />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
          />
          <Bar dataKey="cached" fill="#3b82f6" name="Cached" stackId="tokens" />
          <Bar dataKey="input" fill="#22c55e" name="Input" stackId="tokens" />
          <Bar
            dataKey="output"
            fill="#ef4444"
            name="Output"
            radius={[0, 0, 0, 0]}
            stackId="tokens"
          />
          <Bar
            dataKey="reasoning"
            fill="#a855f7"
            name="Reasoning"
            radius={[4, 4, 0, 0]}
            stackId="tokens"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
```

- [ ] **Step 2: Run typecheck, commit**

```bash
cd apps/web && npx tsc --noEmit
git add apps/web/src/app/\(dashboard\)/adoption/
git commit -m "feat: add adoption stacked token chart"
```

### Task 19: Adoption page — usage table & bars

**Files:**
- Create: `apps/web/src/app/(dashboard)/adoption/components/usage-table.tsx`
- Create: `apps/web/src/app/(dashboard)/adoption/components/usage-bars.tsx`

- [ ] **Step 1: Create usage table**

```typescript
"use client";

import { Spinner } from "@raven/ui";
import { BarChart2 } from "lucide-react";
import type { BreakdownRow } from "../hooks/use-adoption";

interface UsageTableProps {
  data: BreakdownRow[];
  loading: boolean;
}

export const UsageTable = ({ data, loading }: UsageTableProps) => {
  if (loading) {
    return (
      <div className="rounded-xl border border-border p-12 text-center">
        <Spinner className="mx-auto" />
        <p className="mt-3 text-sm text-muted-foreground">Loading usage data...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border p-12 text-center">
        <BarChart2 className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">No usage data yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {data[0]?.label?.includes("/") || data[0]?.label?.includes("-") ? "Model" : "Key"}
            </th>
            <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Cached Tokens
            </th>
            <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Input Tokens
            </th>
            <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Output Tokens
            </th>
            <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Reasoning Tokens
            </th>
            <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Requests
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              className={`transition-colors hover:bg-muted/30 ${idx !== data.length - 1 ? "border-b border-border" : ""}`}
              key={row.label}
            >
              <td className="px-5 py-4 font-medium text-primary">
                {row.label}
              </td>
              <td className="px-5 py-4 text-right tabular-nums">
                {row.cachedTokens.toLocaleString()}
              </td>
              <td className="px-5 py-4 text-right tabular-nums">
                {row.inputTokens.toLocaleString()}
              </td>
              <td className="px-5 py-4 text-right tabular-nums">
                {row.outputTokens.toLocaleString()}
              </td>
              <td className="px-5 py-4 text-right tabular-nums">
                {row.reasoningTokens.toLocaleString()}
              </td>
              <td className="px-5 py-4 text-right tabular-nums">
                {row.requests.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

- [ ] **Step 2: Create usage bars (horizontal bar chart)**

```typescript
"use client";

import type { BreakdownRow } from "../hooks/use-adoption";

interface UsageBarsProps {
  data: BreakdownRow[];
  metric: "inputTokens" | "outputTokens" | "cachedTokens" | "requests";
}

const formatNumber = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

export const UsageBars = ({ data, metric }: UsageBarsProps) => {
  if (data.length === 0) return null;

  const maxValue = Math.max(...data.map((row) => row[metric]));

  return (
    <div className="space-y-3">
      {data.map((row) => {
        const value = row[metric];
        const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;

        return (
          <div
            className="rounded-lg border border-border p-4"
            key={row.label}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{row.label}</span>
              <span className="text-sm tabular-nums text-muted-foreground">
                {formatNumber(value)}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
```

- [ ] **Step 3: Run typecheck, commit**

```bash
cd apps/web && npx tsc --noEmit
git add apps/web/src/app/\(dashboard\)/adoption/
git commit -m "feat: add adoption usage table and horizontal bars"
```

### Task 20: Adoption page — main page

**Files:**
- Create: `apps/web/src/app/(dashboard)/adoption/page.tsx`

- [ ] **Step 1: Create the page**

```typescript
"use client";

import { PageHeader, Tabs } from "@raven/ui";
import { useState } from "react";
import { TokenChart } from "./components/token-chart";
import { UsageBars } from "./components/usage-bars";
import { UsageTable } from "./components/usage-table";
import { type GroupBy, useAdoption } from "./hooks/use-adoption";

type ViewTab = "table" | "bars";
type MetricKey = "inputTokens" | "outputTokens" | "cachedTokens" | "requests";

const METRIC_OPTIONS: { value: MetricKey; label: string }[] = [
  { label: "Input Tokens", value: "inputTokens" },
  { label: "Output Tokens", value: "outputTokens" },
  { label: "Cached Tokens", value: "cachedTokens" },
  { label: "Requests", value: "requests" }
];

const AdoptionPage = () => {
  const {
    breakdownData,
    chartData,
    dateRange,
    dateRangeOptions,
    error,
    groupBy,
    groupByOptions,
    isLoading,
    setDateRange,
    setGroupBy
  } = useAdoption();

  const [viewTab, setViewTab] = useState<ViewTab>("table");
  const [metric, setMetric] = useState<MetricKey>("inputTokens");

  return (
    <div>
      <PageHeader
        description="Top users and usage statistics."
        title="Adoption"
      />

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mb-6 flex items-center gap-1 overflow-x-auto rounded-lg border border-border p-1 w-fit">
        {dateRangeOptions.map((opt) => (
          <button
            className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              dateRange === opt.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            key={opt.value}
            onClick={() => setDateRange(opt.value)}
            type="button"
          >
            {opt.label}
          </button>
        ))}
      </div>

      <TokenChart data={chartData} />

      <Tabs
        onChange={(v) => setViewTab(v as ViewTab)}
        tabs={[
          { label: "Summary", value: "table" },
          { label: "Usage Breakdown", value: "bars" }
        ]}
        value={viewTab}
      />

      {/* Group by + metric controls */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Group by:</span>
          <div className="flex items-center gap-1 rounded-lg border border-border p-1">
            {groupByOptions.map((opt) => (
              <button
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  groupBy === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                key={opt.value}
                onClick={() => setGroupBy(opt.value as GroupBy)}
                type="button"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {viewTab === "bars" && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Metric:</span>
            <select
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
              onChange={(e) => setMetric(e.target.value as MetricKey)}
              value={metric}
            >
              {METRIC_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {viewTab === "table" ? (
        <UsageTable data={breakdownData} loading={isLoading} />
      ) : (
        <UsageBars data={breakdownData} metric={metric} />
      )}
    </div>
  );
};

export default AdoptionPage;
```

- [ ] **Step 2: Run typecheck, commit**

```bash
cd apps/web && npx tsc --noEmit
git add apps/web/src/app/\(dashboard\)/adoption/
git commit -m "feat: add adoption page with token chart, table, and bars"
```

---

## Chunk 4: Models Page & Final Cleanup

### Task 21: Models page — hook

**Files:**
- Create: `apps/web/src/app/(dashboard)/models/hooks/use-models.ts`

- [ ] **Step 1: Create the hook**

```typescript
"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

export interface ModelRow {
  model: string;
  provider: string;
  requests: number;
  totalCost: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  reasoningTokens: number;
  avgLatencyMs: number;
  lastUsed: string | null;
}

export type DateRange = "7d" | "30d" | "90d";

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" }
];

const VALID_RANGES: DateRange[] = ["7d", "30d", "90d"];

const RANGE_MS: Record<DateRange, number> = {
  "7d": 604_800_000,
  "30d": 2_592_000_000,
  "90d": 7_776_000_000
};

const rangeToFrom = (range: DateRange): string =>
  new Date(Date.now() - RANGE_MS[range]).toISOString();

export const modelsQueryOptions = (range: DateRange) =>
  queryOptions({
    queryFn: () =>
      api.get<{ data: ModelRow[] }>(
        `/v1/analytics/models?from=${rangeToFrom(range)}`
      ),
    queryKey: ["models", range]
  });

export const useModels = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const rangeParam = searchParams.get("range") as DateRange | null;
  const dateRange =
    rangeParam && VALID_RANGES.includes(rangeParam) ? rangeParam : "30d";

  const setDateRange = (range: DateRange) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", range);
    router.replace(`?${params.toString()}`);
  };

  const query = useQuery(modelsQueryOptions(dateRange));

  return {
    data: query.data?.data ?? [],
    dateRange,
    dateRangeOptions: DATE_RANGE_OPTIONS,
    error: query.error?.message ?? null,
    isLoading: query.isPending,
    setDateRange
  };
};
```

- [ ] **Step 2: Run typecheck, commit**

```bash
cd apps/web && npx tsc --noEmit
git add apps/web/src/app/\(dashboard\)/models/
git commit -m "feat: add models hook"
```

### Task 22: Models page — table & page

**Files:**
- Create: `apps/web/src/app/(dashboard)/models/components/models-table.tsx`
- Create: `apps/web/src/app/(dashboard)/models/page.tsx`

- [ ] **Step 1: Create models table**

```typescript
"use client";

import { PROVIDER_LABELS } from "@raven/types";
import { Spinner } from "@raven/ui";
import { Cpu } from "lucide-react";
import type { ModelRow } from "../hooks/use-models";

interface ModelsTableProps {
  data: ModelRow[];
  loading: boolean;
}

const formatTimeAgo = (ts: string | null): string => {
  if (!ts) return "\u2014";
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

export const ModelsTable = ({ data, loading }: ModelsTableProps) => {
  if (loading) {
    return (
      <div className="rounded-xl border border-border p-12 text-center">
        <Spinner className="mx-auto" />
        <p className="mt-3 text-sm text-muted-foreground">Loading models...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border p-12 text-center">
        <Cpu className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">No model usage data yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Model
            </th>
            <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Requests
            </th>
            <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Input
            </th>
            <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Output
            </th>
            <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Cached
            </th>
            <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Reasoning
            </th>
            <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Cost
            </th>
            <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Avg Latency
            </th>
            <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Last Used
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              className={`transition-colors hover:bg-muted/30 ${idx !== data.length - 1 ? "border-b border-border" : ""}`}
              key={`${row.provider}-${row.model}`}
            >
              <td className="px-5 py-4">
                <div className="font-medium">{row.model}</div>
                <div className="text-xs text-muted-foreground">
                  {PROVIDER_LABELS[row.provider] ?? row.provider}
                </div>
              </td>
              <td className="px-5 py-4 text-right tabular-nums">
                {row.requests.toLocaleString()}
              </td>
              <td className="px-5 py-4 text-right tabular-nums">
                {row.inputTokens.toLocaleString()}
              </td>
              <td className="px-5 py-4 text-right tabular-nums">
                {row.outputTokens.toLocaleString()}
              </td>
              <td className="px-5 py-4 text-right tabular-nums">
                {row.cachedTokens.toLocaleString()}
              </td>
              <td className="px-5 py-4 text-right tabular-nums">
                {row.reasoningTokens.toLocaleString()}
              </td>
              <td className="px-5 py-4 text-right tabular-nums">
                ${Number(row.totalCost).toFixed(4)}
              </td>
              <td className="px-5 py-4 text-right tabular-nums">
                {Math.round(row.avgLatencyMs)}ms
              </td>
              <td className="px-5 py-4 text-right text-sm text-muted-foreground whitespace-nowrap">
                {formatTimeAgo(row.lastUsed)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

- [ ] **Step 2: Create Models page**

```typescript
"use client";

import { PageHeader } from "@raven/ui";
import { ModelsTable } from "./components/models-table";
import { useModels } from "./hooks/use-models";

const ModelsPage = () => {
  const { data, dateRange, dateRangeOptions, error, isLoading, setDateRange } =
    useModels();

  return (
    <div>
      <PageHeader
        description="Model usage analytics across all providers."
        title="Models"
      />

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mb-6 flex items-center gap-1 overflow-x-auto rounded-lg border border-border p-1 w-fit">
        {dateRangeOptions.map((opt) => (
          <button
            className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              dateRange === opt.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            key={opt.value}
            onClick={() => setDateRange(opt.value)}
            type="button"
          >
            {opt.label}
          </button>
        ))}
      </div>

      <ModelsTable data={data} loading={isLoading} />
    </div>
  );
};

export default ModelsPage;
```

- [ ] **Step 3: Run typecheck, commit**

```bash
cd apps/web && npx tsc --noEmit
git add apps/web/src/app/\(dashboard\)/models/
git commit -m "feat: add models page with analytics table"
```

### Task 23: Final typecheck & integration commit

- [ ] **Step 1: Run full typecheck**

```bash
cd apps/web && npx tsc --noEmit
cd apps/api && npx tsc --noEmit
```

- [ ] **Step 2: Run linter**

```bash
cd apps/web && pnpm run lint
cd apps/api && pnpm run lint
```

- [ ] **Step 3: Fix any issues found**

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat: add aperture-inspired analytics pages"
```
