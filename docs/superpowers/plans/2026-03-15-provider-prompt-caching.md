# Provider Prompt Caching Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically leverage Anthropic and OpenAI prompt caching to reduce costs and populate the `cachedTokens` column.

**Architecture:** Add `transformBody` to the provider adapter interface for Anthropic cache control injection, extend token extraction to capture cached token counts from both providers, and fix cost estimation to apply provider-specific cache discounts.

**Tech Stack:** TypeScript, Hono (API framework), ioredis

**Spec:** `docs/superpowers/specs/2026-03-15-provider-prompt-caching-design.md`

---

## Chunk 1: Token Extraction & Cost Estimation

### Task 1: Extend TokenUsage interface and extractTokenUsage

**Files:**
- Modify: `apps/api/src/modules/proxy/token-usage.ts`

- [ ] **Step 1: Add cached token fields to TokenUsage interface**

Replace the existing `TokenUsage` interface:

```ts
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cachedTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}
```

- [ ] **Step 2: Update extractTokenUsage to extract cached tokens**

Update the function to extract provider-specific cached token fields:

```ts
export const extractTokenUsage = (
  body: Record<string, unknown>
): TokenUsage => {
  const usage = body.usage as Record<string, unknown> | undefined;
  if (!usage)
    return {
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      cachedTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0
    };

  // OpenAI format: prompt_tokens / completion_tokens
  // Anthropic format: input_tokens / output_tokens
  const inputTokens =
    (usage.input_tokens as number) ?? (usage.prompt_tokens as number) ?? 0;
  const outputTokens =
    (usage.output_tokens as number) ?? (usage.completion_tokens as number) ?? 0;

  // OpenAI: completion_tokens_details.reasoning_tokens
  const completionDetails = usage.completion_tokens_details as
    | Record<string, unknown>
    | undefined;
  const reasoningTokens = (completionDetails?.reasoning_tokens as number) ?? 0;

  // OpenAI: prompt_tokens_details.cached_tokens
  const promptDetails = usage.prompt_tokens_details as
    | Record<string, unknown>
    | undefined;
  const openaiCached = (promptDetails?.cached_tokens as number) ?? 0;

  // Anthropic: cache_read_input_tokens / cache_creation_input_tokens
  const anthropicCacheRead = (usage.cache_read_input_tokens as number) ?? 0;
  const anthropicCacheWrite =
    (usage.cache_creation_input_tokens as number) ?? 0;

  const cacheReadTokens = openaiCached || anthropicCacheRead;
  const cacheWriteTokens = anthropicCacheWrite;
  const cachedTokens = cacheReadTokens + cacheWriteTokens;

  return {
    cacheReadTokens,
    cacheWriteTokens,
    cachedTokens,
    inputTokens,
    outputTokens,
    reasoningTokens
  };
};
```

- [ ] **Step 3: Update StreamTokenAccumulator**

Update the class to track cached tokens:

In the private `usage` field, add the new defaults:
```ts
private usage: TokenUsage = {
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  cachedTokens: 0,
  inputTokens: 0,
  outputTokens: 0,
  reasoningTokens: 0
};
```

In `processChunk`, inside the OpenAI `usage` block, add after reasoning tokens extraction:
```ts
// OpenAI: prompt_tokens_details.cached_tokens
const promptDetails = usage.prompt_tokens_details as
  | Record<string, unknown>
  | undefined;
if (promptDetails && typeof promptDetails.cached_tokens === "number") {
  this.usage.cacheReadTokens = promptDetails.cached_tokens;
  this.usage.cachedTokens = promptDetails.cached_tokens;
}
```

In the `message_start` handler, add after `inputTokens` extraction:
```ts
if (typeof msgUsage.cache_read_input_tokens === "number") {
  this.usage.cacheReadTokens = msgUsage.cache_read_input_tokens;
}
if (typeof msgUsage.cache_creation_input_tokens === "number") {
  this.usage.cacheWriteTokens = msgUsage.cache_creation_input_tokens;
}
this.usage.cachedTokens =
  this.usage.cacheReadTokens + this.usage.cacheWriteTokens;
```

In the `message_delta` handler, add after `outputTokens` extraction:
```ts
if (
  deltaUsage &&
  typeof deltaUsage.cache_read_input_tokens === "number"
) {
  this.usage.cacheReadTokens = deltaUsage.cache_read_input_tokens;
  this.usage.cachedTokens =
    this.usage.cacheReadTokens + this.usage.cacheWriteTokens;
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd /Users/yoginth/raven && pnpm turbo build --filter=api`
Expected: Clean build — the changes are additive (new fields on the interface, existing destructuring of subsets still valid).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/proxy/token-usage.ts
git commit -m "feat: extract cached token counts from provider responses"
```

---

### Task 2: Update ProviderAdapter interface and estimateCost

**Files:**
- Modify: `apps/api/src/modules/proxy/providers/registry.ts`
- Modify: `apps/api/src/modules/proxy/providers/anthropic.ts`
- Modify: `apps/api/src/modules/proxy/providers/openai.ts`

- [ ] **Step 1: Add transformBody and update estimateCost on ProviderAdapter**

In `registry.ts`, update the interface:

```ts
export interface ProviderAdapter {
  name: string;
  baseUrl: string;
  transformHeaders(
    apiKey: string,
    headers: Record<string, string>
  ): Record<string, string>;
  transformBody?(body: Record<string, unknown>): Record<string, unknown>;
  estimateCost(
    model: string,
    inputTokens: number,
    outputTokens: number,
    cacheReadTokens?: number,
    cacheWriteTokens?: number
  ): number;
}
```

- [ ] **Step 2: Update Anthropic adapter estimateCost**

In `anthropic.ts`, replace `estimateCost`:

```ts
estimateCost(model, inputTokens, outputTokens, cacheReadTokens = 0, cacheWriteTokens = 0) {
  const pricing = getModelPricing(model, "anthropic");
  const regularInput = inputTokens - cacheReadTokens - cacheWriteTokens;
  const regularInputCost = (regularInput / 1_000_000) * pricing.input;
  const cacheWriteCost = (cacheWriteTokens / 1_000_000) * pricing.input * 1.25;
  const cacheReadCost = (cacheReadTokens / 1_000_000) * pricing.input * 0.1;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return regularInputCost + cacheWriteCost + cacheReadCost + outputCost;
},
```

- [ ] **Step 3: Update OpenAI adapter estimateCost**

In `openai.ts`, replace `estimateCost`:

```ts
estimateCost(model, inputTokens, outputTokens, cacheReadTokens = 0) {
  const pricing = getModelPricing(model, "openai");
  const regularInput = inputTokens - cacheReadTokens;
  const regularInputCost = (regularInput / 1_000_000) * pricing.input;
  const cachedInputCost = (cacheReadTokens / 1_000_000) * pricing.input * 0.5;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return regularInputCost + cachedInputCost + outputCost;
},
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/proxy/providers/registry.ts apps/api/src/modules/proxy/providers/anthropic.ts apps/api/src/modules/proxy/providers/openai.ts
git commit -m "feat: add transformBody to adapter interface and cache-aware cost estimation"
```

---

## Chunk 2: Cache Control Injection & Logging Pipeline

### Task 3: Implement Anthropic transformBody

**Files:**
- Modify: `apps/api/src/modules/proxy/providers/anthropic.ts`

- [ ] **Step 1: Add transformBody to Anthropic adapter**

Add the `transformBody` method to `anthropicAdapter`. Place it after `name` and before `transformHeaders` (alphabetical order per style guide):

```ts
transformBody(body: Record<string, unknown>): Record<string, unknown> {
  const result = { ...body };

  // Inject cache_control on system messages
  if (result.system !== undefined) {
    let systemBlocks: Array<Record<string, unknown>>;

    if (typeof result.system === "string") {
      systemBlocks = [{ text: result.system, type: "text" }];
    } else if (Array.isArray(result.system)) {
      systemBlocks = (result.system as Array<Record<string, unknown>>).map(
        (b) => ({ ...b })
      );
    } else {
      systemBlocks = [];
    }

    if (systemBlocks.length > 0) {
      const hasExisting = systemBlocks.some((b) => b.cache_control);
      if (!hasExisting) {
        systemBlocks[systemBlocks.length - 1]!.cache_control = {
          type: "ephemeral"
        };
      }
      result.system = systemBlocks;
    }
  }

  // Inject cache_control on tool definitions
  if (Array.isArray(result.tools) && result.tools.length > 0) {
    const tools = (result.tools as Array<Record<string, unknown>>).map(
      (t) => ({ ...t })
    );
    const hasExisting = tools.some((t) => t.cache_control);
    if (!hasExisting) {
      tools[tools.length - 1]!.cache_control = { type: "ephemeral" };
    }
    result.tools = tools;
  }

  return result;
},
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/yoginth/raven && pnpm turbo build --filter=api`
Expected: May still have errors in handler.ts — fixed in Task 4.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/proxy/providers/anthropic.ts
git commit -m "feat: inject cache_control breakpoints on Anthropic requests"
```

---

### Task 4: Wire everything through handler and logger

**Files:**
- Modify: `apps/api/src/modules/proxy/logger.ts`
- Modify: `apps/api/src/modules/proxy/handler.ts`

- [ ] **Step 1: Add cachedTokens to LogData interface**

In `logger.ts`, add `cachedTokens: number;` to the `LogData` interface (after `cacheHit`).

- [ ] **Step 2: Update logProxyRequest to use data.cachedTokens**

In `logProxyRequest`, change `cachedTokens: 0` to `cachedTokens: data.cachedTokens`.

- [ ] **Step 3: Add cachedTokens to logData initialization in handler**

In `handler.ts`, add `cachedTokens: 0` to both `logData` objects (the cache-hit path at ~line 156 and the main path at ~line 258).

- [ ] **Step 4: Apply transformBody after cache check**

In `handler.ts`, after the cache-hit early return (after `if (cacheResult.hit) { ... }`) and before the `forwardInput` construction (~line 208), add:

```ts
// 8b. Transform request body for provider-specific optimizations
if (adapter.transformBody && parsedBody && Object.keys(parsedBody).length > 0) {
  const transformed = adapter.transformBody(parsedBody);
  finalBodyText = JSON.stringify(transformed);
}
```

- [ ] **Step 5: Wire cachedTokens in the cache-hit path**

In the cache-hit path (~line 181), the existing code already calls `extractTokenUsage(cacheResult.parsed)`. Update the destructuring to include the new fields:

```ts
const { inputTokens, outputTokens, reasoningTokens, cachedTokens } =
  extractTokenUsage(cacheResult.parsed);
```

Then set `logData.cachedTokens = cachedTokens;` alongside the existing assignments.

For the cache-hit path, cost is already set to 0 (no upstream call), so no `estimateCost` change needed there.

- [ ] **Step 6: Wire cachedTokens in the buffered response path**

In the buffered response post-processing block (~line 298), update the destructuring:

```ts
const {
  inputTokens,
  outputTokens,
  reasoningTokens,
  cachedTokens,
  cacheReadTokens,
  cacheWriteTokens
} = extractTokenUsage(responseBody);
```

Add `logData.cachedTokens = cachedTokens;` alongside the existing assignments.

Update the `estimateCost` call:
```ts
logData.cost = adapter.estimateCost(
  model,
  inputTokens,
  outputTokens,
  cacheReadTokens,
  cacheWriteTokens
);
```

- [ ] **Step 7: Wire cachedTokens in the streaming path**

In the streaming `flush()` callback (~line 352), update the destructuring:

```ts
const {
  inputTokens,
  outputTokens,
  reasoningTokens,
  cachedTokens,
  cacheReadTokens,
  cacheWriteTokens
} = accumulator.getUsage();
```

Add `logData.cachedTokens = cachedTokens;` alongside the existing assignments.

Update the `estimateCost` call:
```ts
logData.cost = adapter.estimateCost(
  model,
  inputTokens,
  outputTokens,
  cacheReadTokens,
  cacheWriteTokens
);
```

- [ ] **Step 8: Verify full build passes**

Run: `cd /Users/yoginth/raven && pnpm turbo build --filter=api`
Expected: Clean build, no errors.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/modules/proxy/logger.ts apps/api/src/modules/proxy/handler.ts
git commit -m "feat: wire cached tokens through logging pipeline and apply transformBody"
```

---

## Chunk 3: Verify & Lint

### Task 5: Final verification

**Files:** None (verification only)

- [ ] **Step 1: Run full monorepo build**

Run: `cd /Users/yoginth/raven && pnpm turbo build`
Expected: All packages and apps build successfully.

- [ ] **Step 2: Run linter**

Run: `cd /Users/yoginth/raven && pnpm turbo lint`
Expected: No new lint errors.

- [ ] **Step 3: Run type check**

Run: `cd /Users/yoginth/raven && pnpm turbo typecheck`
Expected: No type errors.
