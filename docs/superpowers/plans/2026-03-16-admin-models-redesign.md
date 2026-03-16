# Admin Models Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace auto-sync model system with manual model curation via admin UI.

**Architecture:** New API endpoints for searching models.dev, adding/removing individual models, and refreshing pricing. Frontend redesigned to show providers as clickable rows that open a search dialog. models.dev responses are cached in-memory for 10 minutes.

**Tech Stack:** Hono (API), Drizzle ORM, React + TanStack Query (frontend), Base UI Dialog via `Modal` component from `@raven/ui`.

**Spec:** `docs/superpowers/specs/2026-03-16-admin-models-redesign.md`

---

## Chunk 1: Backend — models.dev cache and model management endpoints

### Task 1: Replace model-sync.ts with models-dev cache and model helpers

**Files:**
- Rewrite: `apps/api/src/lib/model-sync.ts`

This file currently contains `syncModels()`, `OPENAI_ALLOWED_MODELS`, auto-sync logic, and the helper functions. Rewrite it to:
- Keep: `ModelsDevModel`, `ModelsDevProvider`, `ModelsDevResponse` types, `PROVIDER_SLUG_MAP`, `deriveCategory()`, `deriveCapabilities()`, `seedDefaultProviders()`, `DEFAULT_PROVIDERS`
- Remove: `syncModels()`, `OPENAI_ALLOWED_MODELS`
- Add: `fetchModelsDevCached()` — fetches models.dev API with 10-minute in-memory cache
- Add: `searchModels(provider, query)` — searches cached models.dev data, returns filtered results
- Add: `getModelsDevModel(provider, modelId)` — looks up a single model from cache

- [ ] **Step 1: Rewrite model-sync.ts**

```typescript
// apps/api/src/lib/model-sync.ts
import type { Database } from "@raven/db";
import { syncedProviders } from "@raven/db";

interface ModelsDevModel {
  id: string;
  name: string;
  family?: string;
  attachment?: boolean;
  reasoning?: boolean;
  tool_call?: boolean;
  temperature?: boolean;
  structured_output?: boolean;
  knowledge?: string;
  release_date?: string;
  modalities?: {
    input?: string[];
    output?: string[];
  };
  open_weights?: boolean;
  cost?: {
    input?: number;
    output?: number;
    cache_read?: number;
    cache_write?: number;
  };
  limit?: {
    context?: number;
    output?: number;
    input?: number;
  };
}

interface ModelsDevProvider {
  id: string;
  name: string;
  models: Record<string, ModelsDevModel>;
}

type ModelsDevResponse = Record<string, ModelsDevProvider>;

export interface SearchResult {
  id: string;
  name: string;
  capabilities: string[];
  category: string;
  contextWindow: number;
  maxOutput: number;
  inputPrice: number;
  outputPrice: number;
}

const MODELS_DEV_API = "https://models.dev/api.json";
const CACHE_TTL_MS = 10 * 60 * 1000;

export const PROVIDER_SLUG_MAP: Record<string, string> = {
  anthropic: "anthropic",
  mistral: "mistralai",
  openai: "openai"
};

// Reverse map: our slug -> models.dev slug
const REVERSE_SLUG_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(PROVIDER_SLUG_MAP).map(([dev, ours]) => [ours, dev])
);

let cachedData: ModelsDevResponse | null = null;
let cacheTimestamp = 0;

export const fetchModelsDevCached = async (): Promise<ModelsDevResponse> => {
  if (cachedData && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedData;
  }

  const res = await fetch(MODELS_DEV_API);
  if (!res.ok) {
    throw new Error(`models.dev API error: ${res.status} ${res.statusText}`);
  }

  cachedData = (await res.json()) as ModelsDevResponse;
  cacheTimestamp = Date.now();
  return cachedData;
};

export const deriveCategory = (
  model: ModelsDevModel,
  inputPrice: number
): string => {
  const slug = model.id.toLowerCase();

  if (model.reasoning) return "reasoning";

  const lowerName = model.name.toLowerCase();
  if (
    slug.includes("mini") ||
    slug.includes("nano") ||
    slug.includes("haiku") ||
    slug.includes("flash") ||
    lowerName.includes("mini") ||
    lowerName.includes("nano")
  ) {
    return "fast";
  }

  if (slug.includes("opus") || slug.includes("pro") || inputPrice >= 5) {
    return "flagship";
  }

  return "balanced";
};

export const deriveCapabilities = (model: ModelsDevModel): string[] => {
  const caps: string[] = ["chat"];

  const inputMods = model.modalities?.input ?? [];
  if (inputMods.includes("image") || inputMods.includes("video")) {
    caps.push("vision");
  }
  if (model.tool_call) caps.push("function_calling");
  if (model.reasoning) caps.push("reasoning");
  caps.push("streaming");

  return caps;
};

export const searchModels = async (
  provider: string,
  query: string
): Promise<SearchResult[]> => {
  const data = await fetchModelsDevCached();
  const devSlug = REVERSE_SLUG_MAP[provider];
  if (!devSlug) return [];

  const providerData = data[devSlug];
  if (!providerData?.models) return [];

  const q = query.toLowerCase();

  return Object.values(providerData.models)
    .filter(
      (m) =>
        m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)
    )
    .map((m) => {
      const inputPrice = m.cost?.input ?? 0;
      return {
        id: m.id,
        name: m.name,
        capabilities: deriveCapabilities(m),
        category: deriveCategory(m, inputPrice),
        contextWindow: m.limit?.context ?? 0,
        maxOutput: m.limit?.output ?? 0,
        inputPrice,
        outputPrice: m.cost?.output ?? 0
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
};

export const getModelsDevModel = async (
  provider: string,
  modelId: string
): Promise<ModelsDevModel | null> => {
  const data = await fetchModelsDevCached();
  const devSlug = REVERSE_SLUG_MAP[provider];
  if (!devSlug) return null;

  const providerData = data[devSlug];
  return providerData?.models?.[modelId] ?? null;
};

const DEFAULT_PROVIDERS = [
  { isEnabled: true, name: "Anthropic", slug: "anthropic" },
  { isEnabled: true, name: "Mistral AI", slug: "mistralai" },
  { isEnabled: true, name: "OpenAI", slug: "openai" }
];

export const seedDefaultProviders = async (db: Database): Promise<void> => {
  const existing = await db.select().from(syncedProviders);
  const existingSlugs = new Set(existing.map((p) => p.slug));
  const missing = DEFAULT_PROVIDERS.filter((p) => !existingSlugs.has(p.slug));

  if (missing.length === 0) return;

  await db.insert(syncedProviders).values(missing);
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/lib/model-sync.ts
git commit -m "refactor: replace auto-sync with models.dev cache and search helpers"
```

### Task 2: Rewrite admin synced-providers module with new endpoints

**Files:**
- Rewrite: `apps/api/src/modules/admin/synced-providers.ts`

Replace all existing handlers with new ones: `searchModels`, `addModel`, `removeModel`, `refreshPricing`, `getProviders` (read-only with model counts).

- [ ] **Step 1: Rewrite synced-providers.ts**

```typescript
// apps/api/src/modules/admin/synced-providers.ts
import type { Database } from "@raven/db";
import { models, syncedProviders } from "@raven/db";
import { count, eq, inArray } from "drizzle-orm";
import type { Context } from "hono";
import {
  deriveCapabilities,
  deriveCategory,
  getModelsDevModel,
  searchModels as searchModelsFromDev
} from "@/lib/model-sync";
import { refreshPricingCache } from "@/lib/pricing-cache";

export const getAdminProviders = (db: Database) => async (c: Context) => {
  const providers = await db
    .select({
      modelCount: count(models.id),
      name: syncedProviders.name,
      slug: syncedProviders.slug
    })
    .from(syncedProviders)
    .leftJoin(models, eq(models.provider, syncedProviders.slug))
    .groupBy(syncedProviders.slug);

  return c.json({ data: providers });
};

export const searchAvailableModels =
  (db: Database) => async (c: Context) => {
    const provider = c.req.query("provider") ?? "";
    const query = c.req.query("q") ?? "";

    if (!provider) {
      return c.json(
        { error: { code: "VALIDATION_ERROR", message: "provider is required" } },
        400
      );
    }

    const results = await searchModelsFromDev(provider, query);

    // Check which models are already added
    const modelIds = results.map((m) => `${provider}/${m.id}`);
    const existing =
      modelIds.length > 0
        ? await db
            .select({ id: models.id })
            .from(models)
            .where(inArray(models.id, modelIds))
        : [];
    const existingIds = new Set(existing.map((m) => m.id));

    const data = results.map((m) => ({
      ...m,
      isAdded: existingIds.has(`${provider}/${m.id}`)
    }));

    return c.json({ data });
  };

export const addModel = (db: Database) => async (c: Context) => {
  const body = await c.req.json<{ provider: string; modelId: string }>();

  if (!body.provider || !body.modelId) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "provider and modelId are required"
        }
      },
      400
    );
  }

  const model = await getModelsDevModel(body.provider, body.modelId);
  if (!model) {
    return c.json(
      { error: { code: "NOT_FOUND", message: "Model not found on models.dev" } },
      404
    );
  }

  const inputPrice = model.cost?.input ?? 0;
  const outputPrice = model.cost?.output ?? 0;
  const id = `${body.provider}/${model.id}`;
  const now = new Date();

  const [inserted] = await db
    .insert(models)
    .values({
      capabilities: deriveCapabilities(model),
      category: deriveCategory(model, inputPrice),
      contextWindow: model.limit?.context ?? 0,
      createdAt: now,
      description: "",
      id,
      inputPrice: inputPrice.toFixed(4),
      maxOutput: model.limit?.output ?? 0,
      name: model.name,
      outputPrice: outputPrice.toFixed(4),
      provider: body.provider,
      slug: model.id,
      updatedAt: now
    })
    .onConflictDoNothing()
    .returning();

  if (!inserted) {
    return c.json(
      { error: { code: "CONFLICT", message: "Model already added" } },
      409
    );
  }

  await refreshPricingCache(db);

  return c.json({ data: inserted }, 201);
};

export const removeModel = (db: Database) => async (c: Context) => {
  const id = c.req.param("id") ?? "";

  if (!id) {
    return c.json(
      { error: { code: "VALIDATION_ERROR", message: "Model ID is required" } },
      400
    );
  }

  const [deleted] = await db
    .delete(models)
    .where(eq(models.id, id))
    .returning();

  if (!deleted) {
    return c.json(
      { error: { code: "NOT_FOUND", message: "Model not found" } },
      404
    );
  }

  await refreshPricingCache(db);

  return c.json({ data: { success: true } });
};

export const refreshModelPricing = (db: Database) => async (c: Context) => {
  const body = await c.req.json<{ provider: string }>();

  if (!body.provider) {
    return c.json(
      { error: { code: "VALIDATION_ERROR", message: "provider is required" } },
      400
    );
  }

  const existingModels = await db
    .select({ id: models.id, slug: models.slug })
    .from(models)
    .where(eq(models.provider, body.provider));

  if (existingModels.length === 0) {
    return c.json({ data: { updated: 0 } });
  }

  let updated = 0;
  const now = new Date();

  for (const existing of existingModels) {
    const model = await getModelsDevModel(body.provider, existing.slug);
    if (!model) continue;

    const inputPrice = model.cost?.input ?? 0;
    const outputPrice = model.cost?.output ?? 0;

    await db
      .update(models)
      .set({
        capabilities: deriveCapabilities(model),
        category: deriveCategory(model, inputPrice),
        contextWindow: model.limit?.context ?? 0,
        inputPrice: inputPrice.toFixed(4),
        maxOutput: model.limit?.output ?? 0,
        name: model.name,
        outputPrice: outputPrice.toFixed(4),
        updatedAt: now
      })
      .where(eq(models.id, existing.id));

    updated++;
  }

  await refreshPricingCache(db);

  return c.json({ data: { updated } });
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/modules/admin/synced-providers.ts
git commit -m "feat: add model search, add, remove, and refresh pricing endpoints"
```

### Task 3: Update admin module router

**Files:**
- Modify: `apps/api/src/modules/admin/index.ts`

Replace old synced-provider routes with new model management routes.

- [ ] **Step 1: Update admin router**

Replace the imports and routes in `apps/api/src/modules/admin/index.ts`:

Old imports:
```typescript
import {
  addSyncedProvider,
  deleteSyncedProvider,
  getAdminSyncedProviders,
  triggerModelSync,
  updateSyncedProvider
} from "./synced-providers";
```

New imports:
```typescript
import {
  addModel,
  getAdminProviders,
  refreshModelPricing,
  removeModel,
  searchAvailableModels
} from "./synced-providers";
```

Old routes:
```typescript
  app.get("/synced-providers", getAdminSyncedProviders(db));
  app.post("/synced-providers", addSyncedProvider(db));
  app.patch("/synced-providers/:slug", updateSyncedProvider(db));
  app.delete("/synced-providers/:slug", deleteSyncedProvider(db));
  app.post("/models/sync", triggerModelSync(db));
```

New routes:
```typescript
  app.get("/providers", getAdminProviders(db));
  app.get("/models/search", searchAvailableModels(db));
  app.post("/models", addModel(db));
  app.delete("/models/:id{.+}", removeModel(db));
  app.post("/models/refresh-pricing", refreshModelPricing(db));
```

Note: The `DELETE /models/:id{.+}` pattern is needed because the model ID contains a slash (e.g., `openai/gpt-5`).

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/modules/admin/index.ts
git commit -m "refactor: update admin routes for manual model management"
```

### Task 4: Remove auto-sync from server startup

**Files:**
- Modify: `apps/api/src/index.ts`
- Delete: `apps/api/src/sync-models.ts`

- [ ] **Step 1: Update index.ts**

Change the import to only import `seedDefaultProviders` (not `syncModels`):

Old:
```typescript
import { seedDefaultProviders, syncModels } from "./lib/model-sync";
```

New:
```typescript
import { seedDefaultProviders } from "./lib/model-sync";
```

Replace the startup block:
```typescript
// Seed default providers and run initial model sync
void (async () => {
  try {
    await seedDefaultProviders(db);
    await syncModels(db);
  } catch (err) {
    console.error("Initial model sync failed:", err);
    // Load pricing cache from DB even if sync fails
    await refreshPricingCache(db).catch(() => {});
  }
})();

// Sync models every 5 minutes
setInterval(() => {
  void syncModels(db).catch((err) =>
    console.error("Scheduled model sync failed:", err)
  );
}, 5 * 60_000);
```

With:
```typescript
// Seed default providers and load pricing cache
void (async () => {
  try {
    await seedDefaultProviders(db);
    await refreshPricingCache(db);
  } catch (err) {
    console.error("Startup initialization failed:", err);
  }
})();
```

- [ ] **Step 2: Delete sync-models.ts**

Delete `apps/api/src/sync-models.ts` — the standalone sync script is no longer needed.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/index.ts
git rm apps/api/src/sync-models.ts
git commit -m "refactor: remove auto-sync and standalone sync script"
```

---

## Chunk 2: Frontend — admin models page redesign

### Task 5: Update admin hooks for new API shape

**Files:**
- Modify: `apps/web/src/app/(admin)/hooks/use-admin.ts`

- [ ] **Step 1: Replace synced provider types and hooks with new ones**

Remove `SyncedProvider`, `SyncResult`, `adminSyncedProvidersQueryOptions`, `useAdminSyncedProviders` and add:

```typescript
export interface AdminProvider {
  slug: string;
  name: string;
  modelCount: number;
}

export interface AvailableModel {
  id: string;
  name: string;
  isAdded: boolean;
  capabilities: string[];
  category: string;
  contextWindow: number;
  maxOutput: number;
  inputPrice: number;
  outputPrice: number;
}

export const adminProvidersQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<AdminProvider[]>("/v1/admin/providers"),
    queryKey: ["admin", "providers"]
  });

export const useAdminProviders = () => useQuery(adminProvidersQueryOptions());
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/(admin)/hooks/use-admin.ts
git commit -m "refactor: update admin hooks for new provider and model API"
```

### Task 6: Create provider models dialog component

**Files:**
- Create: `apps/web/src/app/(admin)/admin/models/provider-models-dialog.tsx`

- [ ] **Step 1: Create the dialog component**

```tsx
// apps/web/src/app/(admin)/admin/models/provider-models-dialog.tsx
"use client";

import { Badge, Modal, Spinner } from "@raven/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, Search } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import type { AvailableModel } from "../../hooks/use-admin";

interface ProviderModelsDialogProps {
  open: boolean;
  onClose: () => void;
  provider: { slug: string; name: string };
}

export const ProviderModelsDialog = ({
  open,
  onClose,
  provider
}: ProviderModelsDialogProps) => {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: models = [], isLoading } = useQuery({
    enabled: open,
    queryFn: () =>
      api.get<AvailableModel[]>(
        `/v1/admin/models/search?provider=${provider.slug}&q=${encodeURIComponent(search)}`
      ),
    queryKey: ["admin", "models-search", provider.slug, search]
  });

  const addMutation = useMutation({
    mutationFn: (modelId: string) =>
      api.post("/v1/admin/models", { modelId, provider: provider.slug }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["admin", "models-search", provider.slug]
      });
      void queryClient.invalidateQueries({ queryKey: ["admin", "providers"] });
    }
  });

  const removeMutation = useMutation({
    mutationFn: (modelId: string) =>
      api.delete(`/v1/admin/models/${provider.slug}/${modelId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["admin", "models-search", provider.slug]
      });
      void queryClient.invalidateQueries({ queryKey: ["admin", "providers"] });
    }
  });

  return (
    <Modal onClose={onClose} open={open} size="lg" title={provider.name}>
      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search models..."
            value={search}
          />
        </div>

        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="sm" />
            </div>
          ) : models.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No models found
            </p>
          ) : (
            <div className="divide-y divide-border">
              {models.map((model) => (
                <div
                  className="flex items-center justify-between py-3"
                  key={model.id}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {model.name}
                      </span>
                      <Badge variant="neutral">{model.category}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {model.id}
                    </p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>${model.inputPrice}/M in</span>
                      <span>${model.outputPrice}/M out</span>
                      {model.contextWindow > 0 && (
                        <span>
                          {(model.contextWindow / 1000).toFixed(0)}K ctx
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    className={`ml-3 inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      model.isAdded
                        ? "text-destructive hover:bg-destructive/10"
                        : "text-primary hover:bg-primary/10"
                    }`}
                    disabled={
                      addMutation.isPending || removeMutation.isPending
                    }
                    onClick={() =>
                      model.isAdded
                        ? removeMutation.mutate(model.id)
                        : addMutation.mutate(model.id)
                    }
                    type="button"
                  >
                    {model.isAdded ? (
                      <>
                        <Minus className="size-3.5" />
                        Remove
                      </>
                    ) : (
                      <>
                        <Plus className="size-3.5" />
                        Add
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/(admin)/admin/models/provider-models-dialog.tsx
git commit -m "feat: add provider models search dialog"
```

### Task 7: Rewrite admin models page

**Files:**
- Rewrite: `apps/web/src/app/(admin)/admin/models/page.tsx`

- [ ] **Step 1: Rewrite the page**

```tsx
// apps/web/src/app/(admin)/admin/models/page.tsx
"use client";

import { Spinner } from "@raven/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, RefreshCw } from "lucide-react";
import { useState } from "react";
import { ProviderIcon } from "@/components/model-icon";
import { api } from "@/lib/api";
import { useAdminProviders } from "../../hooks/use-admin";
import { ProviderModelsDialog } from "./provider-models-dialog";

const AdminModelsPage = () => {
  const { data: providers = [], isPending } = useAdminProviders();
  const queryClient = useQueryClient();
  const [selectedProvider, setSelectedProvider] = useState<{
    slug: string;
    name: string;
  } | null>(null);

  const refreshMutation = useMutation({
    mutationFn: (provider: string) =>
      api.post<{ updated: number }>("/v1/admin/models/refresh-pricing", {
        provider
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "providers"] });
    }
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-bold sm:text-2xl">Models</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add and manage models from each provider.
        </p>
      </div>

      <div className="rounded-xl border border-border">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Providers</h2>
        </div>

        {isPending ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="sm" />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {providers.map((p) => (
              <div
                className="flex items-center justify-between px-5 py-4"
                key={p.slug}
              >
                <button
                  className="flex flex-1 items-center gap-3 text-left"
                  onClick={() =>
                    setSelectedProvider({ name: p.name, slug: p.slug })
                  }
                  type="button"
                >
                  <ProviderIcon provider={p.slug} size={20} />
                  <div>
                    <span className="text-sm font-medium">{p.name}</span>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {p.modelCount} {p.modelCount === 1 ? "model" : "models"}
                    </p>
                  </div>
                  <ChevronRight className="ml-auto size-4 text-muted-foreground" />
                </button>
                <button
                  className="ml-2 inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
                  disabled={refreshMutation.isPending}
                  onClick={(e) => {
                    e.stopPropagation();
                    refreshMutation.mutate(p.slug);
                  }}
                  type="button"
                >
                  <RefreshCw
                    className={`size-3.5 ${refreshMutation.isPending && refreshMutation.variables === p.slug ? "animate-spin" : ""}`}
                  />
                  Refresh Pricing
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedProvider && (
        <ProviderModelsDialog
          onClose={() => setSelectedProvider(null)}
          open={!!selectedProvider}
          provider={selectedProvider}
        />
      )}
    </div>
  );
};

export default AdminModelsPage;
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/(admin)/admin/models/page.tsx
git commit -m "feat: redesign admin models page with provider list and model dialog"
```

---

## Chunk 3: Cleanup

### Task 8: Remove NON_CHAT_PATTERNS filter from provider models endpoint

**Files:**
- Modify: `apps/api/src/modules/providers/models.ts`

The `NON_CHAT_PATTERNS` regex filter is no longer the right place to limit models. The admin manually curates which models exist. The live provider models endpoint (used in the playground) should still filter non-chat models. Keep the filter but remove `image` that was added earlier (since we're no longer filtering image models, we just won't add them manually).

- [ ] **Step 1: Revert the image addition to NON_CHAT_PATTERNS**

In `apps/api/src/modules/providers/models.ts`, change:

```typescript
const NON_CHAT_PATTERNS =
  /embed|tts|whisper|dall-e|image|moderation|realtime|transcri|audio|codex|computer-use|davinci|babbage|search/i;
```

Back to:
```typescript
const NON_CHAT_PATTERNS =
  /embed|tts|whisper|dall-e|moderation|realtime|transcri|audio|codex|computer-use|davinci|babbage|search/i;
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/modules/providers/models.ts
git commit -m "fix: revert image filter from provider models endpoint"
```

### Task 9: Build and verify

- [ ] **Step 1: Run the build**

```bash
pnpm build
```

Expected: Clean build with no errors.

- [ ] **Step 2: Commit any fixes if needed**
