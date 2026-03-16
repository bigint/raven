# Admin Models Page Redesign

Replace the auto-sync model system with manual model curation. Admins select individual models from models.dev per provider. No auto-sync.

## API

### New Endpoints

**`GET /v1/admin/models/search?provider=openai&q=gpt`**

Search models.dev for a provider. Returns available models with an `isAdded` boolean for models already in DB.

Response shape:
```json
{
  "data": [
    {
      "id": "gpt-5",
      "name": "GPT-5",
      "isAdded": true,
      "capabilities": ["chat", "vision", "function_calling", "reasoning", "streaming"],
      "category": "flagship",
      "contextWindow": 1000000,
      "maxOutput": 32768,
      "inputPrice": 10,
      "outputPrice": 30
    }
  ]
}
```

**`POST /v1/admin/models`**

Add a model. Body: `{ provider: "openai", modelId: "gpt-5" }`. Server fetches model data from models.dev (cached), derives category/capabilities/pricing, inserts into `models` table, refreshes pricing cache.

**`DELETE /v1/admin/models/:id`**

Remove a model. The `:id` is the composite key like `openai/gpt-5`. Deletes from `models` table, refreshes pricing cache.

**`POST /v1/admin/models/refresh-pricing`**

Body: `{ provider: "openai" }`. For all models in DB matching the provider, fetches latest pricing/metadata from models.dev and updates them. Refreshes pricing cache.

### Removed

- `POST /v1/admin/models/sync` — no more bulk sync
- `POST /v1/admin/synced-providers` — providers are hardcoded
- `PATCH /v1/admin/synced-providers/:slug` — no enable/disable
- `DELETE /v1/admin/synced-providers/:slug` — no provider deletion
- `GET /v1/admin/synced-providers` — replaced by hardcoded list + model count query
- `syncModels()` function and 5-minute auto-sync interval
- `OPENAI_ALLOWED_MODELS` allowlist

### Kept

- `deriveCategory()`, `deriveCapabilities()` helpers (reused when adding models)
- `seedDefaultProviders()` (seeds 3 providers for FK reference)
- models.dev types and `PROVIDER_SLUG_MAP`
- `GET /v1/admin/synced-providers` simplified to return provider list with model counts (read-only)

## Frontend — Admin Models Page

### Layout

- Header: "Models" title + description
- Three provider rows (Anthropic, Mistral AI, OpenAI), each showing:
  - Provider icon + name
  - Model count
  - "Refresh Pricing" button
  - Entire row is clickable, opens model dialog

### Model Dialog

- Dialog title: provider name
- Search input at top — calls `GET /v1/admin/models/search?provider=X&q=Y`
- Results list per model:
  - Name, model ID
  - Pricing (input/output per 1M tokens)
  - Capability badges
  - "Add" button (for unadded models) or "Remove" button (for added models, red)
- Each add/remove is an immediate API call, no batch save

### Removed from Current Page

- "Sync Now" button
- Enable/disable toggles per provider
- Delete provider button
- Sync status banners

## Data Flow

### Adding a Model

1. Admin opens provider dialog, searches
2. Clicks "Add" → `POST /v1/admin/models` with `{ provider, modelId }`
3. Server fetches models.dev (cached), finds model, derives metadata
4. Inserts into `models` table, refreshes pricing cache
5. Frontend invalidates queries, model shows as added

### Removing a Model

1. Clicks "Remove" → `DELETE /v1/admin/models/:id`
2. Server deletes from `models` table, refreshes pricing cache
3. Frontend invalidates queries

### Refreshing Pricing

1. Clicks "Refresh Pricing" on a provider row
2. `POST /v1/admin/models/refresh-pricing` with `{ provider }`
3. Server fetches models.dev, updates all models for that provider
4. Refreshes pricing cache

### Server-Side Caching

Cache the models.dev API response in memory for 10 minutes to avoid repeated fetches during search-heavy sessions.

## DB Cleanup

On implementation:
- Remove all existing models from DB (they'll be re-added manually)
- Remove xAI provider from `synced_providers` table
- Keep the 3 default providers (anthropic, mistralai, openai) for FK reference

## Pricing Strategy

Pricing comes from models.dev data at add-time. The "Refresh Pricing" button updates pricing for existing models from models.dev. No pricing is derived from API responses.
