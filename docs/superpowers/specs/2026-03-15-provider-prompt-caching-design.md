# Provider Prompt Caching

Automatically leverage provider-level prompt caching to reduce costs and improve latency for Raven proxy users.

## Problem

Raven has a Redis response cache for identical requests, but ignores provider-level prompt caching entirely:

- **Anthropic** offers `cache_control` breakpoints that give 90% off cached input token reads (25% premium on cache writes). Raven doesn't inject these, so users miss savings unless they manually add them.
- **OpenAI** automatically caches prompt prefixes at 50% off, but Raven ignores `cached_tokens` in responses — the `cachedTokens` DB column is always 0.
- **Cost estimation** treats all input tokens equally, overstating costs when caching is active.

## Solution

Four coordinated changes:

### 1. Anthropic Cache Control Injection

Add `transformBody` to the `ProviderAdapter` interface:

```ts
transformBody?(body: Record<string, unknown>): Record<string, unknown>;
```

The Anthropic adapter implements it to inject `cache_control: {"type": "ephemeral"}` on outgoing requests:

- **System messages**: If `system` is a string, convert to `[{type: "text", text: <value>}]`. Add `cache_control` to the **last** block in the array. Skip if any block already has `cache_control`.
- **Tool definitions**: Add `cache_control` to the **last** item in `tools`. Skip if any tool already has `cache_control`.
- **Messages array**: Excluded — system prompts and tools are the stable prefixes that benefit from caching. Messages change every turn and would cause constant cache misses.

OpenAI adapter: no `transformBody` implementation (uses default no-op).

**Ordering**: `transformBody` is called **after** the Redis cache check and **before** `forwardRequest`. The Redis cache key is built from the original (un-transformed) request body so cache lookups are not affected by the injected `cache_control` fields.

**Fallback path**: When `withFallback` triggers a different provider, the body already has `cache_control` fields from the Anthropic transform. This is harmless — OpenAI ignores unknown fields. No re-transformation needed.

### 2. Cached Token Extraction

Update `extractTokenUsage` and `StreamTokenAccumulator` to pull cached token counts from provider responses.

**`TokenUsage` interface** — add three fields:

```ts
interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cachedTokens: number;      // total cached (for DB logging)
  cacheReadTokens: number;   // subset: cache hits (for cost calc)
  cacheWriteTokens: number;  // subset: cache writes (for cost calc)
}
```

**`inputTokens` semantics**: Anthropic's `input_tokens` includes `cache_read_input_tokens` and `cache_creation_input_tokens` as subsets. OpenAI's `prompt_tokens` includes `cached_tokens` as a subset. The cost formulas below subtract accordingly.

**Buffered response extraction** (`extractTokenUsage`):

| Provider | Field | Source |
|----------|-------|--------|
| OpenAI | `cacheReadTokens` | `usage.prompt_tokens_details.cached_tokens` |
| OpenAI | `cacheWriteTokens` | 0 (OpenAI doesn't charge for writes) |
| OpenAI | `cachedTokens` | same as `cacheReadTokens` |
| Anthropic | `cacheReadTokens` | `usage.cache_read_input_tokens` |
| Anthropic | `cacheWriteTokens` | `usage.cache_creation_input_tokens` |
| Anthropic | `cachedTokens` | `cacheReadTokens + cacheWriteTokens` |

**Streaming extraction** (`StreamTokenAccumulator`):

- **OpenAI**: From the last chunk's `usage.prompt_tokens_details.cached_tokens`
- **Anthropic `message_start`**: `message.usage.cache_read_input_tokens` and `cache_creation_input_tokens`
- **Anthropic `message_delta`**: Also check `usage.cache_read_input_tokens` — use the latest value seen (same pattern as existing `output_tokens` handling)

### 3. Accurate Cost Estimation

Update `estimateCost` signature on `ProviderAdapter`:

```ts
estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens?: number,
  cacheWriteTokens?: number
): number;
```

**Anthropic adapter**:
- Regular input cost = `(inputTokens - cacheRead - cacheWrite) / 1M * inputPrice`
- Cache write cost = `cacheWrite / 1M * inputPrice * 1.25`
- Cache read cost = `cacheRead / 1M * inputPrice * 0.10`
- Output cost = `outputTokens / 1M * outputPrice`

**OpenAI adapter**:
- Cached input cost = `cacheRead / 1M * inputPrice * 0.50`
- Regular input cost = `(inputTokens - cacheRead) / 1M * inputPrice`
- Output cost = `outputTokens / 1M * outputPrice`

### 4. Logging Pipeline

- Add `cachedTokens: number` to `LogData` interface
- Update `logProxyRequest` to pass `data.cachedTokens` instead of hardcoded `0`
- Wire `cachedTokens` in **all three** handler log paths:
  1. **Cache-hit path** (Redis cache hit) — extract from cached response body via `extractTokenUsage`
  2. **Buffered response path** — extract from upstream response body
  3. **Streaming response path** — accumulate via `StreamTokenAccumulator`
- Pass `cacheReadTokens` and `cacheWriteTokens` to `adapter.estimateCost` at all three call sites

No DB migration needed — `cachedTokens` column already exists. No frontend changes needed — request detail panel already renders `cachedTokens` and analytics already `sum(cachedTokens)`.

## Files Changed

| File | Change |
|------|--------|
| `proxy/providers/registry.ts` | Add optional `transformBody?` to `ProviderAdapter` |
| `proxy/providers/anthropic.ts` | Implement `transformBody`, update `estimateCost` |
| `proxy/providers/openai.ts` | Update `estimateCost` |
| `proxy/token-usage.ts` | Extract cached tokens in `extractTokenUsage` and `StreamTokenAccumulator` |
| `proxy/handler.ts` | Call `transformBody` (after cache check, before forward), wire `cachedTokens` through all three log paths, pass cache tokens to `estimateCost` |
| `proxy/logger.ts` | Add `cachedTokens` to `LogData`, pass to DB insert |

## Out of Scope

- Mistral / xAI: no provider-level prompt caching APIs
- Org-level toggle for cache injection: injection is safe and idempotent, always-on is the right default
- Messages array cache control: messages change every turn, not a stable prefix
- Frontend changes: existing UI already displays `cachedTokens` correctly
- DB migration: column already exists
