# Provider & Model Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stubbed cost estimator and broken model catalog with a hardcoded MODEL_CATALOG containing real pricing, restrict models to catalog entries only, and clean up dead code.

**Architecture:** Single source of truth `MODEL_CATALOG` in `@raven/data` powers cost estimation, model endpoints, and provider form. Proxy validates models against catalog. No custom models allowed.

**Tech Stack:** TypeScript, Hono (API), React/Next.js (web), Drizzle ORM, TanStack Query

**Spec:** `docs/superpowers/specs/2026-03-21-provider-model-refactor-design.md`

---

### Task 1: Create MODEL_CATALOG in @raven/data

**Files:**
- Rewrite: `packages/data/src/providers.ts`
- Modify: `packages/data/src/index.ts`

- [ ] **Step 1: Rewrite `packages/data/src/providers.ts`**

Replace the current file with the full model catalog. Import `ModelDefinition` from `@raven/types`.

```typescript
import type { ModelDefinition } from "@raven/types";

export const SUPPORTED_PROVIDERS = [
  { name: "Anthropic", slug: "anthropic" },
  { name: "OpenAI", slug: "openai" }
] as const;

export const MODEL_CATALOG: Record<string, ModelDefinition> = {
  // Anthropic models
  "claude-opus-4-6": {
    id: "claude-opus-4-6",
    slug: "claude-opus-4-6",
    name: "Claude Opus 4.6",
    provider: "anthropic",
    category: "flagship",
    description: "Most capable model for complex tasks with 1M context",
    contextWindow: 1_000_000,
    maxOutput: 32_768,
    inputPrice: 5,
    outputPrice: 25,
    capabilities: ["chat", "vision", "function_calling", "streaming", "reasoning"]
  },
  "claude-sonnet-4-6": {
    id: "claude-sonnet-4-6",
    slug: "claude-sonnet-4-6",
    name: "Claude Sonnet 4.6",
    provider: "anthropic",
    category: "balanced",
    description: "Best balance of speed and capability with 1M context",
    contextWindow: 1_000_000,
    maxOutput: 16_384,
    inputPrice: 3,
    outputPrice: 15,
    capabilities: ["chat", "vision", "function_calling", "streaming", "reasoning"]
  },
  "claude-sonnet-4-5-20250929": {
    id: "claude-sonnet-4-5-20250929",
    slug: "claude-sonnet-4-5-20250929",
    name: "Claude Sonnet 4.5 (Sep 2025)",
    provider: "anthropic",
    category: "balanced",
    description: "Previous generation balanced model",
    contextWindow: 200_000,
    maxOutput: 16_384,
    inputPrice: 3,
    outputPrice: 15,
    capabilities: ["chat", "vision", "function_calling", "streaming", "reasoning"]
  },
  "claude-sonnet-4-5": {
    id: "claude-sonnet-4-5",
    slug: "claude-sonnet-4-5",
    name: "Claude Sonnet 4.5",
    provider: "anthropic",
    category: "balanced",
    description: "Previous generation balanced model",
    contextWindow: 200_000,
    maxOutput: 16_384,
    inputPrice: 3,
    outputPrice: 15,
    capabilities: ["chat", "vision", "function_calling", "streaming", "reasoning"]
  },
  "claude-haiku-4-5-20251001": {
    id: "claude-haiku-4-5-20251001",
    slug: "claude-haiku-4-5-20251001",
    name: "Claude Haiku 4.5 (Oct 2025)",
    provider: "anthropic",
    category: "fast",
    description: "Fastest Claude model optimized for speed and cost",
    contextWindow: 200_000,
    maxOutput: 8_192,
    inputPrice: 1,
    outputPrice: 5,
    capabilities: ["chat", "vision", "function_calling", "streaming"]
  },
  "claude-haiku-4-5": {
    id: "claude-haiku-4-5",
    slug: "claude-haiku-4-5",
    name: "Claude Haiku 4.5",
    provider: "anthropic",
    category: "fast",
    description: "Fastest Claude model optimized for speed and cost",
    contextWindow: 200_000,
    maxOutput: 8_192,
    inputPrice: 1,
    outputPrice: 5,
    capabilities: ["chat", "vision", "function_calling", "streaming"]
  },

  // OpenAI models
  "gpt-4.1": {
    id: "gpt-4.1",
    slug: "gpt-4.1",
    name: "GPT-4.1",
    provider: "openai",
    category: "flagship",
    description: "Most capable GPT model with 1M context",
    contextWindow: 1_000_000,
    maxOutput: 32_768,
    inputPrice: 2,
    outputPrice: 8,
    capabilities: ["chat", "vision", "function_calling", "streaming"]
  },
  "gpt-4.1-mini": {
    id: "gpt-4.1-mini",
    slug: "gpt-4.1-mini",
    name: "GPT-4.1 Mini",
    provider: "openai",
    category: "balanced",
    description: "Balanced GPT model for everyday tasks",
    contextWindow: 1_000_000,
    maxOutput: 16_384,
    inputPrice: 0.4,
    outputPrice: 1.6,
    capabilities: ["chat", "vision", "function_calling", "streaming"]
  },
  "gpt-4.1-nano": {
    id: "gpt-4.1-nano",
    slug: "gpt-4.1-nano",
    name: "GPT-4.1 Nano",
    provider: "openai",
    category: "fast",
    description: "Ultra-fast and cheapest GPT model",
    contextWindow: 1_000_000,
    maxOutput: 16_384,
    inputPrice: 0.1,
    outputPrice: 0.4,
    capabilities: ["chat", "function_calling", "streaming"]
  },
  "gpt-4o": {
    id: "gpt-4o",
    slug: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    category: "balanced",
    description: "Multimodal model with vision and audio capabilities",
    contextWindow: 128_000,
    maxOutput: 16_384,
    inputPrice: 2.5,
    outputPrice: 10,
    capabilities: ["chat", "vision", "function_calling", "streaming"]
  },
  "gpt-4o-mini": {
    id: "gpt-4o-mini",
    slug: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    category: "fast",
    description: "Small and fast multimodal model",
    contextWindow: 128_000,
    maxOutput: 16_384,
    inputPrice: 0.15,
    outputPrice: 0.6,
    capabilities: ["chat", "vision", "function_calling", "streaming"]
  },
  "o3": {
    id: "o3",
    slug: "o3",
    name: "o3",
    provider: "openai",
    category: "reasoning",
    description: "Advanced reasoning model for complex problem solving",
    contextWindow: 200_000,
    maxOutput: 100_000,
    inputPrice: 2,
    outputPrice: 8,
    capabilities: ["chat", "function_calling", "streaming", "reasoning"]
  },
  "o3-mini": {
    id: "o3-mini",
    slug: "o3-mini",
    name: "o3 Mini",
    provider: "openai",
    category: "reasoning",
    description: "Fast reasoning model at lower cost",
    contextWindow: 200_000,
    maxOutput: 100_000,
    inputPrice: 1.1,
    outputPrice: 4.4,
    capabilities: ["chat", "function_calling", "streaming", "reasoning"]
  },
  "o4-mini": {
    id: "o4-mini",
    slug: "o4-mini",
    name: "o4 Mini",
    provider: "openai",
    category: "reasoning",
    description: "Latest compact reasoning model",
    contextWindow: 200_000,
    maxOutput: 100_000,
    inputPrice: 1.1,
    outputPrice: 4.4,
    capabilities: ["chat", "function_calling", "streaming", "reasoning"]
  }
};

export const DEFAULT_MODELS: Record<string, string[]> = Object.values(
  MODEL_CATALOG
).reduce<Record<string, string[]>>((acc, m) => {
  (acc[m.provider] ??= []).push(m.id);
  return acc;
}, {});

export const getModelPricing = (
  modelId: string
): { inputPrice: number; outputPrice: number } | null => {
  const model = MODEL_CATALOG[modelId];
  if (!model) return null;
  return { inputPrice: model.inputPrice, outputPrice: model.outputPrice };
};

export const getModelsForProvider = (provider: string): ModelDefinition[] =>
  Object.values(MODEL_CATALOG).filter((m) => m.provider === provider);
```

- [ ] **Step 2: Update `packages/data/src/index.ts` exports**

```typescript
export {
  DEFAULT_MODELS,
  getModelPricing,
  getModelsForProvider,
  MODEL_CATALOG,
  SUPPORTED_PROVIDERS
} from "./providers";
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/yoginth/raven && pnpm --filter @raven/data build`
Expected: Clean build with no errors

- [ ] **Step 4: Commit**

```bash
git add packages/data/
git commit -m "feat: add MODEL_CATALOG with pricing data for all supported models"
```

---

### Task 2: Update @raven/types provider definitions

**Files:**
- Modify: `packages/types/src/providers.ts`

The `PROVIDERS` array in `@raven/types` lists 5 providers (including DeepSeek, Google, Mistral) that aren't actually supported. Update it to derive from the 2 supported providers and keep the utility constants.

- [ ] **Step 1: Update `packages/types/src/providers.ts`**

Replace the hardcoded PROVIDERS array with one that only has Anthropic and OpenAI (matching `SUPPORTED_PROVIDERS` in `@raven/data`). Keep the derived `PROVIDER_LABELS`, `PROVIDER_OPTIONS`, `PROVIDER_FILTER_OPTIONS` since they're imported across the frontend.

```typescript
interface ProviderDefinition {
  readonly id: string;
  readonly label: string;
}

export const PROVIDERS = [
  { id: "anthropic", label: "Anthropic" },
  { id: "openai", label: "OpenAI" }
] as const satisfies readonly ProviderDefinition[];

export type Provider = (typeof PROVIDERS)[number]["id"];

export const PROVIDER_LABELS: Record<string, string> = Object.fromEntries(
  PROVIDERS.map((p) => [p.id, p.label])
);

export const PROVIDER_OPTIONS: { label: string; value: Provider }[] =
  PROVIDERS.map((p) => ({ label: p.label, value: p.id }));

export const PROVIDER_FILTER_OPTIONS: { label: string; value: string }[] = [
  { label: "All Providers", value: "" },
  ...PROVIDER_OPTIONS
];
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/yoginth/raven && pnpm --filter @raven/types build`
Expected: Clean build

- [ ] **Step 3: Commit**

```bash
git add packages/types/
git commit -m "refactor: remove unsupported providers from types package"
```

---

### Task 3: Implement real cost estimator

**Files:**
- Rewrite: `apps/api/src/modules/proxy/cost-estimator.ts`

- [ ] **Step 1: Implement cost calculation**

```typescript
import { getModelPricing } from "@raven/data";
import type { TokenUsage } from "./usage-mapper";

export const estimateCost = (
  _provider: string,
  model: string,
  usage: TokenUsage
): number => {
  const pricing = getModelPricing(model);
  if (!pricing) return 0;

  const inputCost = (usage.inputTokens / 1_000_000) * pricing.inputPrice;
  const outputCost = (usage.outputTokens / 1_000_000) * pricing.outputPrice;
  return inputCost + outputCost;
};
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/yoginth/raven && pnpm --filter api build`
Expected: Clean build

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/proxy/cost-estimator.ts
git commit -m "feat: implement real cost estimation using model catalog pricing"
```

---

### Task 4: Add model validation to proxy

**Files:**
- Modify: `apps/api/src/modules/proxy/handler.ts`

- [ ] **Step 1: Add model validation after body parsing**

In `handler.ts`, after `parsedBody` is set and `hasModel` is determined (~line 67-68), add validation that the requested model exists in MODEL_CATALOG. Insert before the guardrails/routing section:

```typescript
import { MODEL_CATALOG } from "@raven/data";

// After hasModel check, before guardrails:
if (hasModel && !MODEL_CATALOG[parsedBody.model as string]) {
  return c.json(
    {
      error: {
        code: "UNSUPPORTED_MODEL",
        message: `Model '${parsedBody.model}' is not supported. Use /v1/models to see available models.`
      }
    },
    400
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/yoginth/raven && pnpm --filter api build`
Expected: Clean build

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/proxy/handler.ts
git commit -m "feat: validate requested model against catalog in proxy"
```

---

### Task 5: Enrich model API endpoints with catalog data

**Files:**
- Rewrite: `apps/api/src/modules/models/index.ts`
- Rewrite: `apps/api/src/modules/models/available.ts`

- [ ] **Step 1: Rewrite `/v1/models` endpoint**

`apps/api/src/modules/models/index.ts`:

```typescript
import type { Database } from "@raven/db";
import { providerConfigs } from "@raven/db";
import { MODEL_CATALOG } from "@raven/data";
import type { ModelDefinition } from "@raven/types";
import { eq } from "drizzle-orm";
import { Hono } from "hono";

export const createModelsModule = (db: Database) => {
  const app = new Hono();

  app.get("/", async (c) => {
    const provider = c.req.query("provider");

    const configs = await db
      .select({
        models: providerConfigs.models,
        provider: providerConfigs.provider
      })
      .from(providerConfigs)
      .where(eq(providerConfigs.isEnabled, true));

    const seen = new Set<string>();
    const result: ModelDefinition[] = [];

    for (const config of configs) {
      if (provider && config.provider !== provider) continue;
      const models = config.models as string[];
      for (const modelId of models) {
        if (seen.has(modelId)) continue;
        seen.add(modelId);
        const catalogEntry = MODEL_CATALOG[modelId];
        if (catalogEntry) {
          result.push(catalogEntry);
        }
      }
    }

    return c.json({ data: result, object: "list" });
  });

  return app;
};
```

- [ ] **Step 2: Rewrite `/v1/available-models` endpoint**

`apps/api/src/modules/models/available.ts`:

```typescript
import type { Database } from "@raven/db";
import { providerConfigs } from "@raven/db";
import { MODEL_CATALOG } from "@raven/data";
import type { ModelDefinition } from "@raven/types";
import { eq } from "drizzle-orm";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

export const listAvailableModels = (db: Database) => async (c: AuthContext) => {
  const configs = await db
    .select({
      models: providerConfigs.models,
      provider: providerConfigs.provider
    })
    .from(providerConfigs)
    .where(eq(providerConfigs.isEnabled, true));

  const seen = new Set<string>();
  const result: ModelDefinition[] = [];

  for (const config of configs) {
    const models = config.models as string[];
    for (const modelId of models) {
      if (seen.has(modelId)) continue;
      seen.add(modelId);
      const catalogEntry = MODEL_CATALOG[modelId];
      if (catalogEntry) {
        result.push(catalogEntry);
      }
    }
  }

  return success(c, result);
};
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/yoginth/raven && pnpm --filter api build`
Expected: Clean build

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/models/
git commit -m "feat: enrich model endpoints with catalog metadata and pricing"
```

---

### Task 6: Remove upstream model fetching

**Files:**
- Delete: `apps/api/src/modules/providers/models.ts`
- Modify: `apps/api/src/modules/providers/index.ts`
- Modify: `apps/api/src/lib/cache-utils.ts`
- Modify: `apps/web/src/app/(dashboard)/providers/hooks/use-providers.ts`

- [ ] **Step 1: Remove route from providers module**

In `apps/api/src/modules/providers/index.ts`, remove the `listProviderModels` import and the `/:id/models` route:

Remove:
```typescript
import { listProviderModels } from "./models";
```
and:
```typescript
app.get("/:id/models", listProviderModels(db, env, redis));
```

- [ ] **Step 2: Delete `apps/api/src/modules/providers/models.ts`**

- [ ] **Step 3: Remove `providerModels` cache key**

In `apps/api/src/lib/cache-utils.ts`, remove:
```typescript
providerModels: (configId: string) => `provider-models:${configId}`,
```

- [ ] **Step 4: Remove `providerModelsQueryOptions` from frontend hooks**

In `apps/web/src/app/(dashboard)/providers/hooks/use-providers.ts`, remove the `ProviderModel` interface and `providerModelsQueryOptions` function (lines 35-52).

- [ ] **Step 5: Verify builds**

Run: `cd /Users/yoginth/raven && pnpm --filter api build && pnpm --filter web build`
Expected: Clean builds

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: remove upstream model fetching endpoint and cache"
```

---

### Task 7: Refactor provider form to checkbox selection

**Files:**
- Rewrite: `apps/web/src/app/(dashboard)/providers/components/provider-form.tsx`

- [ ] **Step 1: Replace the free-text model input with a checkbox list**

Replace the entire model input section (the `<div className="space-y-1.5">` block with the `models-input` id) with a checkbox list. Remove all suggestion/autocomplete state and handlers (`modelInput`, `showSuggestions`, `highlightedIndex`, `suggestions`, `handleModelKeyDown`, `handleModelPaste`, `modelInputRef`, `suggestionsRef`).

The new form should:
- Import `getModelsForProvider` from `@raven/data`
- Show a scrollable checkbox list of models for the selected provider
- Each checkbox shows model name + model ID
- Toggle models on/off
- When provider changes, auto-select all models for that provider

- [ ] **Step 2: Verify build**

Run: `cd /Users/yoginth/raven && pnpm --filter web build`
Expected: Clean build

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(dashboard)/providers/components/provider-form.tsx
git commit -m "refactor: replace free-text model input with checkbox selection from catalog"
```

---

### Task 8: Update frontend model types and catalog page

**Files:**
- Modify: `apps/web/src/lib/use-models.ts`
- Verify: `apps/web/src/app/(dashboard)/models/components/model-catalog.tsx` (should work with enriched API data)

- [ ] **Step 1: Simplify `use-models.ts`**

Remove the `CatalogModel` interface (use `ModelDefinition` from `@raven/types` instead). Update query options to use `ModelDefinition`.

```typescript
"use client";

import type { ModelDefinition } from "@raven/types";
import type { SelectOption } from "@raven/ui";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ModelIcon } from "@/components/model-icon";
import { api } from "./api";

/** All models from connected providers (org-scoped, for playground) */
export const catalogModelsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<ModelDefinition[]>("/v1/available-models"),
    queryKey: ["available-models"]
  });

/** All models in the platform (public catalog, for models page) */
export const allModelsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<ModelDefinition[]>("/v1/models"),
    queryKey: ["all-models"]
  });

export const useModelOptions = (): readonly SelectOption[] => {
  const { data: models = [] } = useQuery(catalogModelsQueryOptions());

  return useMemo(
    () =>
      models.map((m) => ({
        icon: ModelIcon({ model: m.slug, provider: m.provider, size: 16 }),
        label: `${m.name} (${m.provider})`,
        value: m.slug
      })),
    [models]
  );
};
```

- [ ] **Step 2: Update model-catalog.tsx imports**

In `apps/web/src/app/(dashboard)/models/components/model-catalog.tsx`, replace the `CatalogModel` import with `ModelDefinition` from `@raven/types`:

Change:
```typescript
import { allModelsQueryOptions, type CatalogModel } from "@/lib/use-models";
```
To:
```typescript
import type { ModelDefinition } from "@raven/types";
import { allModelsQueryOptions } from "@/lib/use-models";
```

Update all references: `CatalogModel` → `ModelDefinition` (the `ModelCard` prop, etc.)

The `/v1/models` endpoint now returns the `data` wrapper (`{ data: ModelDefinition[], object: "list" }`), so update the query to extract `.data`:

In `use-models.ts`, the `allModelsQueryOptions` queryFn should handle the response shape. The API returns `{ data: [...], object: "list" }` so:

```typescript
export const allModelsQueryOptions = () =>
  queryOptions({
    queryFn: async () => {
      const res = await api.get<{ data: ModelDefinition[]; object: string }>("/v1/models");
      return res.data;
    },
    queryKey: ["all-models"]
  });
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/yoginth/raven && pnpm --filter web build`
Expected: Clean build

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/use-models.ts apps/web/src/app/(dashboard)/models/
git commit -m "refactor: use ModelDefinition type from catalog for frontend model data"
```

---

### Task 9: Clean up remaining references

**Files:**
- Verify: `apps/api/src/modules/providers/create.ts` — check if it invalidates `providerModels` cache
- Verify: `apps/api/src/modules/providers/update.ts` — same check
- Verify: `apps/api/src/modules/providers/delete.ts` — same check

- [ ] **Step 1: Search for stale `providerModels` cache references**

Run: `grep -r "providerModels\|provider-models" apps/api/src/`

Remove any remaining references to the deleted cache key.

- [ ] **Step 2: Verify full build**

Run: `cd /Users/yoginth/raven && pnpm build`
Expected: All packages and apps build cleanly

- [ ] **Step 3: Commit if any changes**

```bash
git add -A
git commit -m "refactor: clean up stale provider-models cache references"
```
