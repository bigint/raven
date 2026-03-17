# AI SDK Migration Design Spec

**Date:** 2026-03-17
**Branch:** `rethinked-be`
**Status:** Reviewed

## Problem

The proxy handler maintains ~1,150 lines of custom per-provider normalization code across three adapters (Anthropic 597 lines, OpenAI 175 lines, Mistral 383 lines). This code converts between OpenAI-format requests and provider-native formats, handles streaming SSE normalization, image format conversion, tool call mapping, and token usage extraction. Each new provider or format change produces bugs (recent: image_url conversion, max_tokens naming, reasoning_effort stripping).

## Solution

Replace the custom provider adapter + raw fetch architecture with the Vercel AI SDK (`ai` + `@ai-sdk/*` providers) as the execution engine inside the proxy handler. The AI SDK handles all provider communication and format normalization internally.

## Architecture Change

### Before
```
Client (OpenAI format)
  → auth, rate limit, budget, guardrails, routing
  → adapter.normalizeRequest() [per-provider, 200-600 lines each]
  → adapter.transformBody() [cache control injection]
  → adapter.mapEndpoint() [path mapping]
  → adapter.transformHeaders() [auth headers]
  → raw fetch() to provider
  → adapter.normalizeResponse() [buffered] OR adapter.normalizeStreamChunk() [streaming]
  → adapter.estimateCost()
  → StreamTokenAccumulator [per-provider SSE parsing]
  → Client
```

### After
```
Client (OpenAI format)
  → auth, rate limit, budget, guardrails, routing
  → parseIncomingRequest() [OpenAI format → AI SDK messages, ONE parser]
  → streamText() / generateText() [AI SDK handles everything]
  → formatToOpenAI() [AI SDK result → OpenAI format, ONE formatter]
  → estimateCost() [from AI SDK usage data]
  → Client
```

## Component Changes

### Deleted (replaced by AI SDK)
| File | Lines | Reason |
|------|-------|--------|
| `providers/anthropic/chat.ts` | 597 | AI SDK `@ai-sdk/anthropic` handles this |
| `providers/anthropic/index.ts` | 53 | Adapter export no longer needed |
| `providers/openai/chat.ts` | 175 | AI SDK `@ai-sdk/openai` handles this |
| `providers/openai/index.ts` | 47 | Adapter export no longer needed |
| `providers/mistral/chat.ts` | 383 | AI SDK `@ai-sdk/mistral` handles this |
| `providers/mistral/index.ts` | 55 | Adapter export no longer needed |
| `providers/types.ts` | 49 | Adapter interface no longer needed |
| `providers/registry.ts` | 24 | Replaced by provider factory |
| `upstream.ts` | 86 | AI SDK makes the HTTP call |
| `response.ts` | 56 | AI SDK parses the response |
| `token-usage.ts` (most of it) | ~150 | AI SDK provides usage data |
| **Total deleted** | **~1,675** | |

### New files
| File | Purpose |
|------|---------|
| `ai-provider-factory.ts` | Create AI SDK provider instances with dynamic API key, base URL, and headers |
| `request-parser.ts` | Parse incoming OpenAI-format body → AI SDK params, including auto cache control injection |
| `response-formatter.ts` | Convert AI SDK result → OpenAI-format JSON and SSE streams, including error formatting |
| `usage-mapper.ts` | Map AI SDK `LanguageModelUsage` → our `TokenUsage` + cost estimation |

### Modified files
| File | Change |
|------|--------|
| `handler.ts` | Core rewrite: replace normalize+fetch+denormalize with parse→AI SDK→format |
| `provider-resolver.ts` | Return provider name + credentials instead of adapter instance |
| `fallback.ts` | Use AI SDK providers for fallback attempts, filter to same-provider configs |
| `response-analyzer.ts` | Remove dead Anthropic-native code path (all responses now OpenAI format) |
| `retry.ts` | Delete — replaced by AI SDK's built-in `maxRetries` with custom retry config |

### Unchanged files (no modifications needed)
- `auth.ts` — virtual key authentication
- `budget-check.ts` — budget validation
- `rate-limiter.ts` — rate limiting
- `plan-check.ts` — plan limit checks
- `guardrails.ts` — content filtering
- `content-router.ts` — routing rules
- `content-analyzer.ts` — request content analysis (operates on OpenAI-format input)
- `latency-tracker.ts` — metrics
- `logger.ts` — request logging
- `cache.ts` — response caching (operates on OpenAI-format output)
- `prompt-injection.ts` — security

## Detailed Component Design

### 1. ai-provider-factory.ts

Creates AI SDK provider instances dynamically per-request with the resolved API key, optional custom base URL, and header passthrough.

```typescript
import { createAnthropic } from "@ai-sdk/anthropic";
import { createMistral } from "@ai-sdk/mistral";
import { createOpenAI } from "@ai-sdk/openai";

interface ProviderFactoryInput {
  provider: string;
  apiKey: string;
  baseUrl?: string;
  headers?: Record<string, string>;  // passthrough headers from client
}

// Returns a LanguageModel instance ready for streamText/generateText
function createProviderModel(input: ProviderFactoryInput, modelId: string): LanguageModel
```

Each provider is instantiated with `createOpenAI({ apiKey, baseURL, headers })` etc. The factory maps provider names to AI SDK provider constructors.

**Header passthrough:** Client headers (after stripping security-sensitive ones like `authorization`, `host`, `origin`) are forwarded via the provider's `headers` option. This preserves support for provider-specific headers like Anthropic's `anthropic-beta`.

**API version management:** Delegated entirely to the AI SDK. Each `@ai-sdk/*` provider manages its own API version headers. We no longer hardcode `anthropic-version: 2023-06-01` — the AI SDK keeps this current.

**Custom base URLs:** Supported per-request via the `baseURL` option on each provider constructor. This enables Azure OpenAI, on-premise deployments, or any custom endpoint configured in `providerConfigs`.

### 2. request-parser.ts

Converts incoming OpenAI-format request body to AI SDK function parameters.

**Input:** Raw parsed JSON body (OpenAI chat completion format)
**Output:** Parameters object for `streamText()`/`generateText()`

Handles:
- `messages` array → AI SDK `ModelMessage[]` (text, image, tool_call, tool_result)
- `tools` array → AI SDK tool definitions
- `tool_choice` → AI SDK tool choice
- `temperature`, `top_p`, `max_tokens` → AI SDK options
- `stream` → determines streamText vs generateText
- Provider-specific options via `providerOptions`:
  - `reasoning_effort` → `providerOptions.openai.reasoningEffort`
  - Cache control → `providerOptions.anthropic.cacheControl`
- `response_format` → AI SDK response format
- `stop` sequences → AI SDK stop sequences
- `stream_options` → preserved for response formatter (controls whether usage chunk is emitted in SSE)

**Key decisions:**
- Images: OpenAI's `image_url` content parts map to AI SDK's image content parts (base64 or URL)
- System messages: AI SDK handles system message positioning per provider
- Tool calls in assistant messages: Map OpenAI's `tool_calls` array to AI SDK format
- Tool results: Map OpenAI's `tool` role messages to AI SDK tool result parts

**Automatic cache control injection (Anthropic):** The current `transformBody` auto-injects `cache_control: { type: "ephemeral" }` on the last system block and last tool definition for Anthropic requests. This is a Raven value-add — customers get automatic prompt caching without configuring it. The request parser preserves this: when the target provider is Anthropic, it adds `providerOptions.anthropic.cacheControl` on the last system message content part and last tool. This logic lives in a dedicated `injectCacheControl(messages, tools, provider)` helper.

**`n > 1` limitation:** AI SDK's `generateText`/`streamText` do not support `n > 1` (multiple choices). If the incoming request has `n > 1`, we fall back to raw fetch pass-through (same as non-chat endpoints). This is a rare parameter — document in migration notes.

### 3. response-formatter.ts

Converts AI SDK results back to OpenAI-format responses.

**For buffered (generateText):**
```json
{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "...",
  "choices": [{
    "index": 0,
    "message": { "role": "assistant", "content": "...", "tool_calls": [...] },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": ...,
    "completion_tokens": ...,
    "total_tokens": ...
  }
}
```

**For streaming (streamText):**
OpenAI-format SSE events (`data: {...}\n\n` lines with `choices[0].delta`).

AI SDK's `fullStream` provides all events (text-delta, tool-call, finish, etc.). The formatter iterates over the stream and emits OpenAI-compatible SSE chunks. When the original request included `stream_options: { include_usage: true }`, the formatter emits a final SSE chunk with the usage data before `[DONE]`.

**Reasoning/thinking content:** AI SDK exposes reasoning via `result.reasoning` (for Anthropic extended thinking) and `result.providerMetadata` (for provider-specific reasoning data). The response formatter maps these to the same output format clients currently receive: `thinking_blocks` field for Anthropic thinking, `reasoning_content` for Mistral Magistral.

**Error formatting:** When the AI SDK throws (e.g., `APICallError`), the response-formatter catches the error and produces an OpenAI-compatible error response:
```json
{
  "error": {
    "message": "...",
    "type": "...",
    "code": "..."
  }
}
```
The raw provider error body is preserved when available via `error.data` or `error.responseBody`, so clients that parse provider-specific error formats continue to work. The error's HTTP status code is forwarded as-is.

### 4. usage-mapper.ts

Maps AI SDK's `LanguageModelUsage` to our `TokenUsage` interface:

```typescript
// AI SDK provides:
usage.inputTokens                          → inputTokens
usage.outputTokens                         → outputTokens
usage.inputTokenDetails.cacheReadTokens    → cacheReadTokens
usage.inputTokenDetails.cacheWriteTokens   → cacheWriteTokens
usage.outputTokenDetails.reasoningTokens   → reasoningTokens
usage.raw                                  → raw provider data (fallback for anything AI SDK misses)
```

Cost estimation stays custom (AI SDK doesn't do costs). Pricing data per model remains in our system, but the function signature simplifies since we get clean token counts from AI SDK.

### 5. handler.ts rewrite

The handler pipeline becomes:

```
1.  authenticateKey()              [unchanged]
2.  Promise.all([                  [unchanged]
      checkRateLimit(),
      checkPlanLimit(),
      checkBudgets()
    ])
3.  Parse body                     [unchanged]
4.  Promise.all([                  [unchanged]
      evaluateGuardrails(),
      evaluateRoutingRules()
    ])
5.  Validate model                 [unchanged]
6.  resolveProvider()              [returns { providerName, apiKey, configId, baseUrl }]
7.  checkCache()                   [unchanged]
8.  Guard: if n > 1, fall back to raw fetch path [NEW]
9.  parseIncomingRequest(body)     [NEW: OpenAI format → AI SDK params]
10. createProviderModel()          [NEW: create AI SDK model instance]
11. streamText() or generateText() [NEW: AI SDK makes the call]
    - With maxRetries for retry logic
    - With AbortSignal for timeout
    - Wrapped in try/catch for error handling + fallback
12. formatToOpenAI(result)         [NEW: AI SDK result → OpenAI format]
13. mapUsage() + estimateCost()    [SIMPLIFIED]
14. logAndPublish()                [unchanged]
15. Return response                [unchanged]
```

### 6. Fallback changes

Current fallback logic tries alternative provider configs. With AI SDK:
1. First attempt fails → catch AI SDK error
2. Get fallback provider configs — **filtered to same provider type only**. Cross-provider fallback (e.g., Anthropic → OpenAI) requires model ID mapping which is out of scope. Same-provider fallback (different API keys or endpoints) works cleanly.
3. For each fallback: create new AI SDK model instance with fallback's API key/base URL
4. Call streamText/generateText with the fallback model
5. Return first successful result

### 7. Streaming architecture

Current: Raw `TransformStream` piping upstream SSE through chunk normalizer.

New: AI SDK's `streamText()` returns a result with multiple stream accessors:
- `result.textStream` — text deltas only
- `result.fullStream` — all events (text, tool calls, finish, usage)
- `result.toDataStream()` — AI SDK's wire format
- `result.pipeDataStreamToResponse()` — direct pipe

We use `result.fullStream` to build OpenAI-format SSE events, giving us control over the exact wire format clients expect. The `onFinish` callback provides final usage data for logging.

**Usage in SSE stream:** When `stream_options.include_usage` is set, the response formatter emits a final SSE chunk containing usage data (matching OpenAI's format) before the `[DONE]` sentinel.

### 8. Error handling

AI SDK throws typed errors:
- `APICallError` — upstream provider returned an error (4xx/5xx)
- `TypeValidationError` — response parsing failed
- `RetryError` — all retries exhausted

The handler catches these in a try/catch around the AI SDK call:
1. **`APICallError`** — extract status code and response body. If not OK, trigger fallback logic (same as current `!upstreamResult.response.ok`). If fallback also fails, format the error via response-formatter.
2. **`RetryError`** — unwrap the last error, trigger fallback. Same flow.
3. **Other errors** — format as 500 with generic message, log the error.

This preserves the current behavior where clients receive the upstream provider's error body.

### 9. Non-chat endpoints

Endpoints like embeddings, audio transcription, image generation are **out of scope** for this migration. They continue using raw fetch pass-through since:
- They have minimal normalization needs
- AI SDK coverage varies for these endpoints
- The chat path is where all the pain is

These can be migrated later with `embed()` etc.

### 10. OpenAI-compat handler

`/v1/chat/completions` handler (`openai-compat/handler.ts`) follows the same pattern as the proxy handler. It resolves model → provider, then uses the same AI SDK flow. This handler can share the same request-parser, response-formatter, and provider-factory modules.

## Token Usage Mapping (Complete)

| Our field | AI SDK source | Fallback |
|-----------|--------------|----------|
| `inputTokens` | `usage.inputTokens` | `usage.raw.prompt_tokens` |
| `outputTokens` | `usage.outputTokens` | `usage.raw.completion_tokens` |
| `reasoningTokens` | `usage.outputTokenDetails.reasoningTokens` | `usage.raw.completion_tokens_details.reasoning_tokens` |
| `cacheReadTokens` | `usage.inputTokenDetails.cacheReadTokens` | `usage.raw.cache_read_input_tokens` or `usage.raw.prompt_tokens_details.cached_tokens` |
| `cacheWriteTokens` | `usage.inputTokenDetails.cacheWriteTokens` | `usage.raw.cache_creation_input_tokens` |
| `cachedTokens` | cacheReadTokens + cacheWriteTokens | — |

The `usage.raw` field contains the original provider response, so anything AI SDK doesn't normalize is still accessible.

## Dependencies to Add

```
ai                  — Core SDK (streamText, generateText)
@ai-sdk/anthropic   — Anthropic provider
@ai-sdk/openai      — OpenAI provider
@ai-sdk/mistral     — Mistral provider
```

## Dependencies to Remove

None immediately. The old adapter code is deleted but no npm packages are removed (none were provider SDKs — it was all custom fetch).

## Risk Mitigation

1. **AI SDK bug affects all providers** — Pin AI SDK versions and test before upgrading. The `usage.raw` fallback ensures we never lose data.
2. **New provider feature not yet in AI SDK** — `providerOptions` allows passing raw provider-specific params. `usage.raw` captures provider-specific response data.
3. **Performance overhead** — AI SDK adds minimal overhead (object construction). The HTTP call dominates latency.
4. **Breaking change in AI SDK** — Pin to specific major version. AI SDK follows semver.
5. **Cross-provider fallback regression** — Fallback filtered to same-provider only. Document this change. Cross-provider fallback can be added later with model mapping.
6. **`n > 1` regression** — Rare parameter. Falls back to raw fetch path. Document in migration notes.

## Rollback Plan

1. Old adapter files are moved to `providers/_legacy/` (not deleted) during implementation
2. A `USE_AI_SDK` environment variable controls the code path in the handler
3. Setting `USE_AI_SDK=false` restores the old normalize+fetch+denormalize flow
4. Once validated in production for 1-2 weeks, delete `_legacy/` and the feature flag

## Out of Scope

- Frontend playground changes (separate task)
- SDK package (`@raven/sdk`) changes (separate task)
- Non-chat endpoints (embeddings, audio, image gen)
- Database schema changes (none needed)
- Cost estimation refactor (keep existing pricing logic, just change input source)
- Cross-provider model mapping for fallback
