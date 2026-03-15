# Provider Adapter Refactor

Replace hardcoded per-provider adapters with a data-driven registry so any OpenAI-compatible provider works through the proxy without code changes.

## Problem

The proxy has a hardcoded `ADAPTERS` map with only `anthropic` and `openai`. Any request to another provider (Mistral, xAI, Groq, etc.) throws `Unknown provider`, even though these providers are in the model catalog and have `provider_configs` in the database. Adding a new provider requires writing a new adapter file and registering it — unnecessary for OpenAI-compatible providers that only differ in base URL.

## Solution

### 1. Expand the PROVIDERS map

Add all known providers to `lib/providers.ts`. Each entry has `baseUrl`, `authHeaders`, `validationPath`, and `label`. Provider slugs match `model-sync.ts` DEFAULT_PROVIDERS.

New entries (all OpenAI-compatible — Bearer auth, `/models` validation):

| Slug | Base URL | Label |
|------|----------|-------|
| `mistralai` | `https://api.mistral.ai/v1` | Mistral AI |
| `x-ai` | `https://api.x.ai/v1` | xAI |
| `deepseek` | `https://api.deepseek.com/v1` | DeepSeek |
| `groq` | `https://api.groq.com/openai/v1` | Groq |
| `together` | `https://api.together.xyz/v1` | Together AI |
| `perplexity` | `https://api.perplexity.ai` | Perplexity |
| `fireworks` | `https://api.fireworks.ai/inference/v1` | Fireworks AI |
| `sambanova` | `https://api.sambanova.ai/v1` | SambaNova |
| `cerebras` | `https://api.cerebras.ai/v1` | Cerebras |

Existing `anthropic` and `openai` entries unchanged.

Note: These providers are added to `PROVIDERS` for proxy routing and key validation. They are **not** added to `DEFAULT_PROVIDERS` in `model-sync.ts` — that's a separate concern for model catalog seeding and can be done independently.

### 2. Dynamic adapter registry

Replace the hardcoded `ADAPTERS` map in `proxy/providers/registry.ts` with:

```ts
export const getProviderAdapter = (provider: string): ProviderAdapter => {
  if (provider === "anthropic") return anthropicAdapter;
  return createOpenAICompatibleAdapter(provider);
};
```

`createOpenAICompatibleAdapter(provider)` is a factory function that:
- Looks up `PROVIDERS[provider]` for `baseUrl` and `authHeaders`
- For unknown providers not in `PROVIDERS`, falls back to Bearer auth (`Authorization: Bearer ${apiKey}`) and uses `https://api.openai.com/v1` as base URL. The request will fail at the upstream with a clear HTTP error, which is better than throwing `Unknown provider` internally.
- Uses `getModelPricing(model, provider)` for cost estimation — passes the actual provider slug so pricing cache can look up exact model prices. For providers without entries in `PROVIDER_DEFAULTS`, this falls through to `DEFAULT_PRICING` (input: $3, output: $15 per million tokens), which is a reasonable conservative estimate.
- Applies the OpenAI cache discount formula (50% on reads) since all OpenAI-compatible providers that support caching follow this pattern.
- No `transformBody` (only Anthropic needs it).

Remove `getSupportedProviders` — it has no callers in the codebase and is no longer meaningful when any provider string is accepted.

### 3. Delete openai.ts adapter

The `openai.ts` adapter file is deleted. Its logic is absorbed into `createOpenAICompatibleAdapter` which uses the same `estimateCost` formula and `transformHeaders` from `PROVIDERS`.

### 4. Anthropic adapter stays

`anthropic.ts` is unchanged. It has provider-specific behavior:
- `transformBody` for cache control injection
- Different `estimateCost` formula (1.25x write, 0.1x read vs OpenAI's 0.5x read)
- Different auth headers (`x-api-key` + `anthropic-version`)

## Files Changed

| File | Change |
|------|--------|
| `lib/providers.ts` | Add 9 new provider entries |
| `proxy/providers/registry.ts` | Replace `ADAPTERS` map with `getProviderAdapter` function + `createOpenAICompatibleAdapter` factory. Remove `getSupportedProviders` (no callers). |
| `proxy/providers/openai.ts` | Delete — absorbed into factory |

## Files Unchanged

- `proxy/providers/anthropic.ts` — stays as special case
- `proxy/handler.ts` — uses adapter interface, unaffected
- `proxy/upstream.ts` — uses adapter interface, unaffected
- `proxy/fallback.ts` — `getProviderAdapter` still returns an adapter, now works for any provider
- `proxy/provider-resolver.ts` — same
- `proxy/logger.ts` — unaffected
- `modules/providers/helpers.ts` — `getProviderConfig` returns `undefined` for unknown providers, validation is skipped (existing behavior). New providers in `PROVIDERS` now get key validation too.

## Out of Scope

- Storing baseUrl in DB (future enhancement for custom/self-hosted providers)
- Custom adapters for Gemini/Cohere/Azure (different API formats, not OpenAI-compatible)
- Ollama (localhost, no auth — needs special handling for auth-less providers)
- UI changes for adding new providers
- Seeding new providers into `DEFAULT_PROVIDERS` for model catalog sync
