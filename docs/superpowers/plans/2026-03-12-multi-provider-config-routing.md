# Multi-Provider Config Routing Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users with multiple API keys for the same provider to target a specific one via path-based config ID routing (`/v1/proxy/openai~configId/...`), track which config was used per request, and show inline usage docs in the provider form modal.

**Architecture:** Add `providerConfigId` column to `request_logs`. Update proxy path parsing to split `provider~configId` and look up by ID when present, falling back to first-enabled when absent. Replace analytics subqueries with direct column reads. Add inline docs section to provider form modal showing the config-specific proxy URL.

**Tech Stack:** Drizzle ORM (Postgres), Hono (API), React/TanStack Query (frontend)

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `packages/db/src/schema/request-logs.ts` | Add `providerConfigId` column |
| Modify | `packages/db/src/schema/index.ts` | Ensure providerConfigs re-exported (already is) |
| Modify | `apps/api/src/modules/proxy/provider-resolver.ts` | Parse `provider~configId` path, resolve by ID or fallback |
| Modify | `apps/api/src/modules/proxy/logger.ts` | Add `providerConfigId` to `LogData` and insert |
| Modify | `apps/api/src/modules/proxy/handler.ts` | Pass `providerConfigId` through to logger |
| Modify | `apps/api/src/modules/analytics/usage.ts` | Replace subquery with `providerConfigId` join |
| Modify | `apps/api/src/modules/analytics/requests.ts` | Replace subquery with `providerConfigId` join |
| Modify | `apps/api/src/modules/analytics/requests-live.ts` | Replace subquery with `providerConfigId` join |
| Modify | `apps/web/src/app/(dashboard)/providers/components/provider-form.tsx` | Add inline usage docs section |

---

## Chunk 1: Database & Proxy Layer

### Task 1: Add `providerConfigId` column to `request_logs`

**Files:**
- Modify: `packages/db/src/schema/request-logs.ts`

- [ ] **Step 1: Add the column to the schema**

```typescript
// Add import for providerConfigs
import { providerConfigs } from "./providers";

// Add to the table definition (after `provider`):
providerConfigId: text("provider_config_id").references(
  () => providerConfigs.id,
  { onDelete: "set null" }
),
```

The column is nullable — existing rows won't have it, and the fallback path (no `~configId`) may not always resolve to a known config.

- [ ] **Step 2: Generate the migration**

Run: `cd packages/db && pnpm generate`

- [ ] **Step 3: Run the migration**

Run: `cd packages/db && pnpm migrate`

- [ ] **Step 4: Commit**

```bash
git add packages/db/
git commit -m "feat: add providerConfigId column to request_logs"
```

---

### Task 2: Update provider resolver to parse `provider~configId`

**Files:**
- Modify: `apps/api/src/modules/proxy/provider-resolver.ts`

- [ ] **Step 1: Update `ProviderResolution` interface**

Add `providerConfigId` to the return type:

```typescript
export interface ProviderResolution {
  adapter: ProviderAdapter;
  decryptedApiKey: string;
  providerConfigId: string;
  providerName: string;
  upstreamPath: string;
}
```

- [ ] **Step 2: Update `resolveProvider` to parse and handle `~configId`**

Replace the full function body:

```typescript
export const resolveProvider = async (
  db: Database,
  env: Env,
  organizationId: string,
  reqPath: string
): Promise<ProviderResolution> => {
  const pathSegments = reqPath.replace(/^\/v1\/proxy\/?/, "").split("/");
  const providerSegment = pathSegments[0];

  if (!providerSegment) {
    throw new ValidationError("Provider not specified in path");
  }

  // Parse "openai~configId" or just "openai"
  const tildeIdx = providerSegment.indexOf("~");
  const providerName = tildeIdx === -1 ? providerSegment : providerSegment.slice(0, tildeIdx);
  const configId = tildeIdx === -1 ? null : providerSegment.slice(tildeIdx + 1);

  if (!providerName) {
    throw new ValidationError("Provider not specified in path");
  }

  let providerConfig: typeof providerConfigs.$inferSelect | undefined;

  if (configId) {
    // Look up by specific config ID
    const [result] = await db
      .select()
      .from(providerConfigs)
      .where(
        and(
          eq(providerConfigs.id, configId),
          eq(providerConfigs.organizationId, organizationId),
          eq(providerConfigs.provider, providerName)
        )
      )
      .limit(1);
    providerConfig = result;

    if (!providerConfig) {
      throw new NotFoundError(
        `No provider config found for '${providerName}' with ID '${configId}'`
      );
    }
  } else {
    // Fallback: first enabled config for this provider
    const [result] = await db
      .select()
      .from(providerConfigs)
      .where(
        and(
          eq(providerConfigs.organizationId, organizationId),
          eq(providerConfigs.provider, providerName)
        )
      )
      .limit(1);
    providerConfig = result;

    if (!providerConfig) {
      throw new NotFoundError(`No provider config found for '${providerName}'`);
    }
  }

  if (!providerConfig.isEnabled) {
    throw new ForbiddenError(`Provider '${providerName}' is disabled`);
  }

  const adapter = getProviderAdapter(providerName);

  let decryptedApiKey: string;
  try {
    decryptedApiKey = decrypt(providerConfig.apiKey, env.ENCRYPTION_SECRET);
  } catch {
    throw new Error("Failed to decrypt provider credentials");
  }

  const upstreamPath = `/${pathSegments.slice(1).join("/")}`;

  return {
    adapter,
    decryptedApiKey,
    providerConfigId: providerConfig.id,
    providerName,
    upstreamPath
  };
};
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/proxy/provider-resolver.ts
git commit -m "feat: support provider~configId path routing in proxy resolver"
```

---

### Task 3: Thread `providerConfigId` through logger and handler

**Files:**
- Modify: `apps/api/src/modules/proxy/logger.ts`
- Modify: `apps/api/src/modules/proxy/handler.ts`

- [ ] **Step 1: Add `providerConfigId` to `LogData` interface and insert**

In `logger.ts`, add `providerConfigId` to the interface and the insert values:

```typescript
export interface LogData {
  organizationId: string;
  virtualKeyId: string;
  provider: string;
  providerConfigId: string;
  model: string;
  method: string;
  path: string;
  statusCode: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  latencyMs: number;
  cacheHit: boolean;
}
```

In `logProxyRequest`, add to the `.values()` call:

```typescript
providerConfigId: data.providerConfigId,
```

- [ ] **Step 2: Pass `providerConfigId` from handler**

In `handler.ts`, destructure `providerConfigId` from `resolveProvider` result:

```typescript
const { adapter, decryptedApiKey, providerConfigId, providerName, upstreamPath } =
  await resolveProvider(db, env, virtualKey.organizationId, c.req.path);
```

Add to `logData` object:

```typescript
providerConfigId,
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/proxy/logger.ts apps/api/src/modules/proxy/handler.ts
git commit -m "feat: store providerConfigId in request logs"
```

---

## Chunk 2: Analytics & Frontend

### Task 4: Update analytics endpoints to use `providerConfigId` join

**Files:**
- Modify: `apps/api/src/modules/analytics/usage.ts`
- Modify: `apps/api/src/modules/analytics/requests.ts`
- Modify: `apps/api/src/modules/analytics/requests-live.ts`

- [ ] **Step 1: Update `usage.ts`**

Replace the subquery approach with a left join on `providerConfigId`:

```typescript
import type { Database } from "@raven/db";
import { providerConfigs, requestLogs } from "@raven/db";
import { and, avg, count, eq, sum } from "drizzle-orm";
import { leftJoin } from "drizzle-orm"; // not needed, use db.select().from().leftJoin()
import type { Context } from "hono";

import { parseDateRange } from "./helpers";

export const getUsage = (db: Database) => async (c: Context) => {
  const orgId = c.get("orgId" as never) as string;
  const { from, to } = c.req.query();

  const dateConditions = parseDateRange(from, to);
  const where = and(eq(requestLogs.organizationId, orgId), ...dateConditions);

  const rows = await db
    .select({
      avgLatencyMs: avg(requestLogs.latencyMs),
      model: requestLogs.model,
      provider: requestLogs.provider,
      providerConfigName: providerConfigs.name,
      totalCost: sum(requestLogs.cost),
      totalInputTokens: sum(requestLogs.inputTokens),
      totalOutputTokens: sum(requestLogs.outputTokens),
      totalRequests: count()
    })
    .from(requestLogs)
    .leftJoin(
      providerConfigs,
      eq(requestLogs.providerConfigId, providerConfigs.id)
    )
    .where(where)
    .groupBy(requestLogs.provider, requestLogs.model, providerConfigs.name)
    .orderBy(requestLogs.provider, requestLogs.model);

  return c.json(rows);
};
```

- [ ] **Step 2: Update `requests.ts`**

Replace the subquery with a left join. Remove the `providerConfigNameSubquery` constant. Use explicit select with left join:

```typescript
import type { Database } from "@raven/db";
import { providerConfigs, requestLogs } from "@raven/db";
import { and, count, eq, sql } from "drizzle-orm";
import type { Context } from "hono";

import { parseDateRange } from "./helpers";

export const getRequests = (db: Database) => async (c: Context) => {
  // ... (filtering logic stays the same)

  const [rows, countResult] = await Promise.all([
    db
      .select({
        cachedTokens: requestLogs.cachedTokens,
        cacheHit: requestLogs.cacheHit,
        cost: requestLogs.cost,
        createdAt: requestLogs.createdAt,
        id: requestLogs.id,
        inputTokens: requestLogs.inputTokens,
        latencyMs: requestLogs.latencyMs,
        method: requestLogs.method,
        model: requestLogs.model,
        organizationId: requestLogs.organizationId,
        outputTokens: requestLogs.outputTokens,
        path: requestLogs.path,
        provider: requestLogs.provider,
        providerConfigName: providerConfigs.name,
        statusCode: requestLogs.statusCode,
        virtualKeyId: requestLogs.virtualKeyId
      })
      .from(requestLogs)
      .leftJoin(
        providerConfigs,
        eq(requestLogs.providerConfigId, providerConfigs.id)
      )
      .where(where)
      .orderBy(sql`${requestLogs.createdAt} DESC`)
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(requestLogs).where(where)
  ]);

  // ... rest stays the same
};
```

- [ ] **Step 3: Update `requests-live.ts`**

Same pattern — replace the subquery with a left join for the initial batch:

```typescript
const initial = await db
  .select({
    cachedTokens: requestLogs.cachedTokens,
    cacheHit: requestLogs.cacheHit,
    cost: requestLogs.cost,
    createdAt: requestLogs.createdAt,
    id: requestLogs.id,
    inputTokens: requestLogs.inputTokens,
    latencyMs: requestLogs.latencyMs,
    method: requestLogs.method,
    model: requestLogs.model,
    organizationId: requestLogs.organizationId,
    outputTokens: requestLogs.outputTokens,
    path: requestLogs.path,
    provider: requestLogs.provider,
    providerConfigName: providerConfigs.name,
    statusCode: requestLogs.statusCode,
    virtualKeyId: requestLogs.virtualKeyId
  })
  .from(requestLogs)
  .leftJoin(
    providerConfigs,
    eq(requestLogs.providerConfigId, providerConfigs.id)
  )
  .where(eq(requestLogs.organizationId, orgId))
  .orderBy(desc(requestLogs.createdAt))
  .limit(50);
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/analytics/
git commit -m "refactor: use providerConfigId join instead of subquery for analytics"
```

---

### Task 5: Add inline usage docs to provider form modal

**Files:**
- Modify: `apps/web/src/app/(dashboard)/providers/components/provider-form.tsx`

- [ ] **Step 1: Add usage docs section after the form in edit mode**

After the `<Switch>` component and before the button row, add a docs section that shows when editing (so the user has the config ID):

```tsx
{isEdit && editingProvider && (
  <div className="rounded-lg border border-border bg-muted/30 p-4">
    <p className="text-sm font-medium">Usage</p>
    <p className="mt-1 text-xs text-muted-foreground">
      Use this config ID in your proxy path to route requests to this specific key:
    </p>
    <code className="mt-2 block rounded-md bg-background px-3 py-2 text-xs">
      /v1/proxy/{editingProvider.provider}~{editingProvider.id}/chat/completions
    </code>
    <p className="mt-2 text-xs text-muted-foreground">
      Without the config ID, requests will use the first available key for the provider:
    </p>
    <code className="mt-2 block rounded-md bg-background px-3 py-2 text-xs">
      /v1/proxy/{editingProvider.provider}/chat/completions
    </code>
  </div>
)}
```

Also show the config ID after creation. After a successful create, the modal closes — so instead, show the config ID inline as a read-only field when editing:

Add a read-only Config ID field at the top of the edit form (after the Provider select):

```tsx
{isEdit && editingProvider && (
  <div className="space-y-1.5">
    <label className="text-sm font-medium text-muted-foreground">
      Config ID
    </label>
    <code className="block rounded-md border border-input bg-muted/50 px-3 py-2 text-xs">
      {editingProvider.id}
    </code>
  </div>
)}
```

- [ ] **Step 2: Lint check**

Run: `pnpm biome check apps/web/src/app/\(dashboard\)/providers/components/provider-form.tsx`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/providers/components/provider-form.tsx
git commit -m "feat: add inline usage docs with config ID to provider form modal"
```

---

### Task 6: Final lint and verify

- [ ] **Step 1: Lint all modified files**

Run: `pnpm biome check --write .`

- [ ] **Step 2: TypeScript check**

Run: `pnpm -r typecheck` (or equivalent)

- [ ] **Step 3: Commit any lint fixes**

```bash
git add -A
git commit -m "chore: lint fixes"
```
