# Provider & Model Refactor Design

## Problem

The provider/model system has several issues after removing the models DB and sync logic:

1. **Cost estimator is a stub** — returns 0 for all requests, no cost tracking
2. **Model catalog page is broken** — frontend expects rich metadata (pricing, context window, capabilities) but API returns only `{ id, object, owned_by }`
3. **Provider definitions are duplicated and out of sync** — `SUPPORTED_PROVIDERS` in `@raven/data` (2 providers) vs `PROVIDERS` in `@raven/types` (5 providers)
4. **Custom models allowed but unsupported** — provider form allows typing arbitrary model IDs that have no pricing data and clutter the system
5. **Two redundant model endpoints** — `/v1/models` and `/v1/available-models` do essentially the same DB query
6. **Upstream model fetching is dead weight** — `/providers/:id/models` fetches from provider API but we want hardcoded models only

## Decision: Hardcoded Model Catalog with Pricing

All supported models are defined in a single `MODEL_CATALOG` in `@raven/data`. Pricing comes from official provider pricing pages (Anthropic, OpenAI). Custom/unknown models are not allowed — the proxy rejects them.

## Changes

### 1. `packages/data/src/providers.ts` → `packages/data/src/models.ts`

Create `MODEL_CATALOG` — a `Record<string, ModelDefinition>` keyed by model ID:

```typescript
export const MODEL_CATALOG: Record<string, ModelDefinition> = {
  "claude-opus-4-6": {
    id: "claude-opus-4-6",
    name: "Claude Opus 4.6",
    provider: "anthropic",
    category: "flagship",
    contextWindow: 1_000_000,
    maxOutput: 32_768,
    inputPrice: 5,      // per 1M tokens
    outputPrice: 25,     // per 1M tokens
    capabilities: ["chat", "vision", "function_calling", "streaming", "reasoning"],
    description: "Most capable model for complex tasks"
  },
  // ... all other models
};
```

Derive `DEFAULT_MODELS` from catalog:

```typescript
export const DEFAULT_MODELS: Record<string, string[]> = Object.values(MODEL_CATALOG)
  .reduce((acc, m) => {
    (acc[m.provider] ??= []).push(m.id);
    return acc;
  }, {} as Record<string, string[]>);
```

Add pricing lookup:

```typescript
export const getModelPricing = (modelId: string) => {
  const model = MODEL_CATALOG[modelId];
  if (!model) return null;
  return { inputPrice: model.inputPrice, outputPrice: model.outputPrice };
};
```

Keep `SUPPORTED_PROVIDERS` — derived from catalog:

```typescript
export const SUPPORTED_PROVIDERS = [
  { name: "Anthropic", slug: "anthropic" },
  { name: "OpenAI", slug: "openai" }
] as const;
```

### 2. `packages/types/src/providers.ts`

Remove `PROVIDERS` constant (move to `@raven/data`). Keep only `PROVIDER_LABELS`, `PROVIDER_OPTIONS`, `PROVIDER_FILTER_OPTIONS` — derived from `SUPPORTED_PROVIDERS` imported from `@raven/data`.

### 3. `apps/api/src/modules/proxy/cost-estimator.ts`

Implement real cost calculation:

```typescript
import { getModelPricing } from "@raven/data";

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

### 4. `apps/api/src/modules/models/index.ts` (public `/v1/models`)

Enrich response with catalog data. Return full `ModelDefinition` objects for models from enabled provider configs:

```typescript
// For each model ID in provider configs, look up MODEL_CATALOG[id]
// Return enriched data, skip models not in catalog
```

### 5. `apps/api/src/modules/models/available.ts` (org-scoped `/v1/available-models`)

Same enrichment as above. Both endpoints return `ModelDefinition[]`.

### 6. Proxy model validation

In `apps/api/src/modules/proxy/handler.ts` or `execute.ts`, validate that the requested model exists in `MODEL_CATALOG`. If not, return a 400 error:

```json
{
  "error": {
    "code": "UNSUPPORTED_MODEL",
    "message": "Model 'xyz' is not supported. Use /v1/models to see available models."
  }
}
```

### 7. Provider form (frontend)

Remove free-text model input. Replace with a checkbox list of models from `DEFAULT_MODELS[provider]`, showing model names from catalog. No custom model entry.

### 8. Remove dead code

- `apps/api/src/modules/providers/models.ts` — upstream model fetching endpoint
- Remove `/providers/:id/models` route from `index.ts`
- Remove `provider-models:${configId}` cache key usage
- Clean up `use-models.ts` frontend — `CatalogModel` interface no longer needed (use `ModelDefinition` from `@raven/types`)

## Model Pricing Data

### Anthropic (per 1M tokens)

| Model | Input | Output | Context | Max Output |
|-------|-------|--------|---------|------------|
| claude-opus-4-6 | $5.00 | $25.00 | 1M | 32K |
| claude-sonnet-4-6 | $3.00 | $15.00 | 1M | 16K |
| claude-sonnet-4-5-20250929 | $3.00 | $15.00 | 200K | 16K |
| claude-sonnet-4-5 | $3.00 | $15.00 | 200K | 16K |
| claude-haiku-4-5-20251001 | $1.00 | $5.00 | 200K | 8K |
| claude-haiku-4-5 | $1.00 | $5.00 | 200K | 8K |

### OpenAI (per 1M tokens)

| Model | Input | Output | Context | Max Output |
|-------|-------|--------|---------|------------|
| gpt-4.1 | $2.00 | $8.00 | 1M | 32K |
| gpt-4.1-mini | $0.40 | $1.60 | 1M | 16K |
| gpt-4.1-nano | $0.10 | $0.40 | 1M | 16K |
| gpt-4o | $2.50 | $10.00 | 128K | 16K |
| gpt-4o-mini | $0.15 | $0.60 | 128K | 16K |
| o3 | $2.00 | $8.00 | 200K | 100K |
| o3-mini | $1.10 | $4.40 | 200K | 100K |
| o4-mini | $1.10 | $4.40 | 200K | 100K |

## Files Changed

| File | Action |
|------|--------|
| `packages/data/src/providers.ts` | Rewrite — add MODEL_CATALOG, derive DEFAULT_MODELS |
| `packages/data/src/index.ts` | Update exports |
| `packages/types/src/providers.ts` | Remove PROVIDERS, keep labels/options |
| `packages/types/src/models.ts` | Keep ModelDefinition type, ensure it matches catalog |
| `apps/api/src/modules/proxy/cost-estimator.ts` | Implement real cost calculation |
| `apps/api/src/modules/models/index.ts` | Enrich with catalog data |
| `apps/api/src/modules/models/available.ts` | Enrich with catalog data |
| `apps/api/src/modules/proxy/execute.ts` | Add model validation |
| `apps/api/src/modules/providers/models.ts` | Delete |
| `apps/api/src/index.ts` | Remove /providers/:id/models route |
| `apps/web/src/lib/use-models.ts` | Remove CatalogModel, use ModelDefinition |
| `apps/web/src/app/(dashboard)/providers/components/provider-form.tsx` | Checkbox multi-select, no custom input |
| `apps/web/src/app/(dashboard)/models/components/model-catalog.tsx` | Works once API returns real data |
