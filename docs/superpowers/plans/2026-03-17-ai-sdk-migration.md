# AI SDK Migration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace custom per-provider normalization adapters with the Vercel AI SDK as the execution engine in the proxy handler, eliminating ~1,675 lines of manual format conversion code.

**Architecture:** Incoming OpenAI-format requests are parsed into AI SDK's universal message format, executed via `streamText()`/`generateText()` with the appropriate provider, and the result is formatted back to OpenAI-compatible JSON/SSE. Auth, rate limiting, caching, guardrails, logging, and cost estimation remain unchanged.

**Tech Stack:** `ai` (Vercel AI SDK core), `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/mistral`, Hono, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-17-ai-sdk-migration-design.md`

---

## File Structure

### New files (in `apps/api/src/modules/proxy/`)
| File | Responsibility |
|------|---------------|
| `ai-provider-factory.ts` | Create AI SDK `LanguageModel` instances from provider name + API key + base URL + headers |
| `request-parser.ts` | Parse OpenAI-format request body → AI SDK `streamText`/`generateText` parameters |
| `response-formatter.ts` | Convert AI SDK results → OpenAI-format JSON (buffered) and SSE stream (streaming) |
| `usage-mapper.ts` | Map AI SDK `LanguageModelUsage` → `TokenUsage` interface |
| `cost-estimator.ts` | Unified cost estimation extracted from per-provider adapters |

### Modified files
| File | Change |
|------|--------|
| `handler.ts` | Rewrite core to use parse→AI SDK→format flow |
| `provider-resolver.ts` | Return raw credentials instead of adapter instance |
| `fallback.ts` | Use AI SDK providers, filter to same-provider |
| `response-analyzer.ts` | Remove dead Anthropic-native code path |

### Deleted files
| File | Replaced by |
|------|-------------|
| `providers/anthropic/chat.ts` | `@ai-sdk/anthropic` |
| `providers/anthropic/index.ts` | `ai-provider-factory.ts` |
| `providers/openai/chat.ts` | `@ai-sdk/openai` |
| `providers/openai/index.ts` | `ai-provider-factory.ts` |
| `providers/mistral/chat.ts` | `@ai-sdk/mistral` |
| `providers/mistral/index.ts` | `ai-provider-factory.ts` |
| `providers/types.ts` | No longer needed |
| `providers/registry.ts` | `ai-provider-factory.ts` |
| `upstream.ts` | AI SDK handles HTTP |
| `response.ts` | `response-formatter.ts` |
| `token-usage.ts` | `usage-mapper.ts` |
| `retry.ts` | AI SDK `maxRetries` option |

### Unchanged files
`auth.ts`, `budget-check.ts`, `rate-limiter.ts`, `plan-check.ts`, `plan-gate.ts`, `guardrails.ts`, `content-router.ts`, `content-analyzer.ts`, `latency-tracker.ts`, `logger.ts`, `cache.ts`, `prompt-injection.ts`, `domain-resolver.ts`, `prompt-resolver.ts`

### Key Implementation Notes

1. **`baseUrl` sourcing:** The `providerConfigs` DB table has no `baseUrl` column. Base URLs come from the static `PROVIDERS` config in `@/lib/providers.ts`. The AI SDK providers default to their standard URLs when no `baseURL` is passed, so we only pass it when sourced from `PROVIDERS`.
2. **AI SDK tools require `tool()` + `jsonSchema()` wrappers** — raw objects won't work. Import `tool` and `jsonSchema` from `ai`.
3. **`streamText()` returns synchronously** — errors surface during stream consumption, not at call site. Streaming fallback must detect errors by consuming the first chunk.
4. **`p-retry` cannot be removed** — still used by `webhook-dispatcher.ts`.
5. **Provider-specific normalizations still needed:** OpenAI reasoning_effort+tools conflict, Mistral `$id`/`$schema` stripping from tool schemas. Add these to the request parser.
6. **Cross-provider fallback regression:** Same-provider only. Log warnings when cross-provider configs exist but are skipped.

---

## Task 1: Install AI SDK dependencies

**Files:**
- Modify: `apps/api/package.json`

- [ ] **Step 1: Install AI SDK packages**

```bash
cd /Users/yoginth/raven && pnpm add ai @ai-sdk/anthropic @ai-sdk/openai @ai-sdk/mistral --filter @raven/api
```

- [ ] **Step 2: Verify installation**

```bash
cd /Users/yoginth/raven/apps/api && pnpm exec tsc --noEmit --pretty 2>&1 | head -5
```

Expected: No new errors (existing errors are fine).

- [ ] **Step 3: Commit**

```bash
git add apps/api/package.json pnpm-lock.yaml
git commit -m "feat: add Vercel AI SDK dependencies"
```

---

## Task 2: Create usage-mapper.ts

**Files:**
- Create: `apps/api/src/modules/proxy/usage-mapper.ts`

This is a leaf dependency with no imports from other new files, so it can be built first.

- [ ] **Step 1: Create the usage mapper**

```typescript
// apps/api/src/modules/proxy/usage-mapper.ts

export interface TokenUsage {
  cachedTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
}

interface AiSdkUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  inputTokenDetails?: {
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
    noCacheTokens?: number;
  };
  outputTokenDetails?: {
    textTokens?: number;
    reasoningTokens?: number;
  };
  raw?: Record<string, unknown>;
}

/**
 * Maps AI SDK LanguageModelUsage to our TokenUsage interface.
 * Falls back to raw provider data for anything the AI SDK doesn't normalize.
 */
export const mapUsage = (usage: AiSdkUsage): TokenUsage => {
  const inputTokens = usage.inputTokens ?? 0;
  const outputTokens = usage.outputTokens ?? 0;

  // AI SDK normalized fields
  let cacheReadTokens = usage.inputTokenDetails?.cacheReadTokens ?? 0;
  let cacheWriteTokens = usage.inputTokenDetails?.cacheWriteTokens ?? 0;
  let reasoningTokens = usage.outputTokenDetails?.reasoningTokens ?? 0;

  // Fallback to raw provider data if AI SDK fields are zero
  if (usage.raw && cacheReadTokens === 0 && cacheWriteTokens === 0) {
    const raw = usage.raw as Record<string, unknown>;
    // Anthropic raw format
    cacheReadTokens =
      (raw.cache_read_input_tokens as number) ?? cacheReadTokens;
    cacheWriteTokens =
      (raw.cache_creation_input_tokens as number) ?? cacheWriteTokens;
    // OpenAI raw format
    const promptDetails = raw.prompt_tokens_details as
      | Record<string, unknown>
      | undefined;
    if (promptDetails) {
      cacheReadTokens =
        (promptDetails.cached_tokens as number) ?? cacheReadTokens;
    }
  }

  if (usage.raw && reasoningTokens === 0) {
    const raw = usage.raw as Record<string, unknown>;
    const completionDetails = raw.completion_tokens_details as
      | Record<string, unknown>
      | undefined;
    if (completionDetails) {
      reasoningTokens =
        (completionDetails.reasoning_tokens as number) ?? reasoningTokens;
    }
  }

  return {
    cachedTokens: cacheReadTokens + cacheWriteTokens,
    cacheReadTokens,
    cacheWriteTokens,
    inputTokens,
    outputTokens,
    reasoningTokens
  };
};
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /Users/yoginth/raven/apps/api && pnpm exec tsc --noEmit --pretty 2>&1 | grep "usage-mapper" || echo "No errors in usage-mapper"
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/proxy/usage-mapper.ts
git commit -m "feat: add AI SDK usage mapper"
```

---

## Task 3: Create cost-estimator.ts

**Files:**
- Create: `apps/api/src/modules/proxy/cost-estimator.ts`

Extracts and unifies cost estimation from the three provider adapters into a single function.

- [ ] **Step 1: Create the cost estimator**

```typescript
// apps/api/src/modules/proxy/cost-estimator.ts

import { getModelPricing } from "@/lib/pricing-cache";
import type { TokenUsage } from "./usage-mapper";

/**
 * Cache cost multipliers by provider.
 * Anthropic: cache read = 10% of input price, cache write = 125% of input price.
 * OpenAI/Mistral: cache read = 50% of input price, no write cost.
 */
const CACHE_MULTIPLIERS: Record<
  string,
  { read: number; write: number }
> = {
  anthropic: { read: 0.1, write: 1.25 },
  mistralai: { read: 0.5, write: 0 },
  openai: { read: 0.5, write: 0 }
};

const DEFAULT_CACHE_MULTIPLIER = { read: 0.5, write: 0 };

export const estimateCost = (
  provider: string,
  model: string,
  usage: TokenUsage
): number => {
  const pricing = getModelPricing(model, provider);
  const multiplier = CACHE_MULTIPLIERS[provider] ?? DEFAULT_CACHE_MULTIPLIER;

  const regularInput = Math.max(
    0,
    usage.inputTokens - usage.cacheReadTokens - usage.cacheWriteTokens
  );
  const regularInputCost = (regularInput / 1_000_000) * pricing.input;
  const cacheReadCost =
    (usage.cacheReadTokens / 1_000_000) * pricing.input * multiplier.read;
  const cacheWriteCost =
    (usage.cacheWriteTokens / 1_000_000) * pricing.input * multiplier.write;
  const outputCost = (usage.outputTokens / 1_000_000) * pricing.output;

  return regularInputCost + cacheReadCost + cacheWriteCost + outputCost;
};
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /Users/yoginth/raven/apps/api && pnpm exec tsc --noEmit --pretty 2>&1 | grep "cost-estimator" || echo "No errors in cost-estimator"
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/proxy/cost-estimator.ts
git commit -m "feat: add unified cost estimator"
```

---

## Task 4: Create ai-provider-factory.ts

**Files:**
- Create: `apps/api/src/modules/proxy/ai-provider-factory.ts`

- [ ] **Step 1: Create the provider factory**

```typescript
// apps/api/src/modules/proxy/ai-provider-factory.ts

import { createAnthropic } from "@ai-sdk/anthropic";
import { createMistral } from "@ai-sdk/mistral";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export interface ProviderFactoryInput {
  provider: string;
  apiKey: string;
  baseUrl?: string;
  headers?: Record<string, string>;
}

/**
 * Headers stripped from client request before passing to provider.
 * Security-sensitive headers must not be forwarded.
 */
const STRIPPED_HEADERS = new Set([
  "authorization",
  "connection",
  "content-length",
  "host",
  "origin",
  "referer",
  "sec-ch-ua",
  "sec-ch-ua-mobile",
  "sec-ch-ua-platform",
  "sec-fetch-dest",
  "sec-fetch-mode",
  "sec-fetch-site",
  "transfer-encoding",
  "user-agent"
]);

export const filterPassthroughHeaders = (
  headers: Record<string, string>
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(headers).filter(
      ([k]) => !STRIPPED_HEADERS.has(k.toLowerCase())
    )
  );

type ProviderConstructor = (config: {
  apiKey: string;
  baseURL?: string;
  headers?: Record<string, string>;
}) => { languageModel: (modelId: string) => LanguageModel };

const PROVIDER_MAP: Record<string, ProviderConstructor> = {
  anthropic: createAnthropic as unknown as ProviderConstructor,
  mistralai: createMistral as unknown as ProviderConstructor,
  openai: createOpenAI as unknown as ProviderConstructor
};

/**
 * Creates an AI SDK LanguageModel instance for the given provider and model.
 * The provider is instantiated per-request with the resolved API key and optional
 * custom base URL + passthrough headers.
 */
export const createProviderModel = (
  input: ProviderFactoryInput,
  modelId: string
): LanguageModel => {
  const constructor = PROVIDER_MAP[input.provider];

  if (!constructor) {
    // Unknown providers default to OpenAI-compatible
    const provider = createOpenAI({
      apiKey: input.apiKey,
      baseURL: input.baseUrl,
      headers: input.headers
    });
    return provider.languageModel(modelId);
  }

  const provider = constructor({
    apiKey: input.apiKey,
    baseURL: input.baseUrl,
    headers: input.headers
  });

  return provider.languageModel(modelId);
};
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /Users/yoginth/raven/apps/api && pnpm exec tsc --noEmit --pretty 2>&1 | grep "ai-provider-factory" || echo "No errors in ai-provider-factory"
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/proxy/ai-provider-factory.ts
git commit -m "feat: add AI SDK provider factory"
```

---

## Task 5: Create request-parser.ts

**Files:**
- Create: `apps/api/src/modules/proxy/request-parser.ts`

This is the most complex new file. It parses OpenAI-format request body into AI SDK parameters.

- [ ] **Step 1: Create the request parser**

The parser must handle:
- Messages with text, images (`image_url` content parts), tool calls, tool results
- System messages (OpenAI puts them in the messages array)
- Tools array (OpenAI format with `function` wrapper → AI SDK tool definitions)
- Tool choice mapping
- Provider-specific options (reasoning_effort, cache control)
- Automatic Anthropic cache control injection
- All standard parameters (temperature, top_p, max_tokens, stop, etc.)

```typescript
// apps/api/src/modules/proxy/request-parser.ts

import type {
  CoreAssistantMessage,
  CoreMessage,
  CoreSystemMessage,
  CoreToolMessage,
  CoreUserMessage,
  ImagePart,
  TextPart,
  ToolCallPart,
  ToolResultPart
} from "ai";

export interface ParsedRequest {
  messages: CoreMessage[];
  system?: string;
  tools?: Record<string, { description?: string; parameters: unknown }>;
  toolChoice?: "auto" | "none" | "required" | { toolName: string };
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  stopSequences?: string[];
  providerOptions?: Record<string, Record<string, unknown>>;
  isStreaming: boolean;
  streamOptions?: { includeUsage?: boolean };
  responseFormat?: unknown;
  seed?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  /** If true, request uses n > 1 and must fall back to raw proxy */
  requiresRawProxy: boolean;
}

/**
 * Parse an OpenAI-format message content block into AI SDK content parts.
 */
const parseContentParts = (
  content: unknown
): (TextPart | ImagePart)[] => {
  if (typeof content === "string") {
    return [{ type: "text", text: content }];
  }

  if (!Array.isArray(content)) {
    return [{ type: "text", text: String(content ?? "") }];
  }

  const parts: (TextPart | ImagePart)[] = [];

  for (const block of content) {
    const b = block as Record<string, unknown>;

    if (b.type === "text") {
      parts.push({
        type: "text",
        text: b.text as string,
        ...(b.cache_control
          ? {
              providerOptions: {
                anthropic: {
                  cacheControl: b.cache_control as Record<string, unknown>
                }
              }
            }
          : {})
      } as TextPart);
    } else if (b.type === "image_url") {
      const imageUrl = b.image_url as Record<string, unknown>;
      const url = imageUrl?.url as string;
      if (url) {
        parts.push({
          type: "image",
          image: url
        } as ImagePart);
      }
    } else if (b.type === "image") {
      // Already in Anthropic format — convert to AI SDK
      const source = b.source as Record<string, unknown>;
      if (source?.type === "base64") {
        const mediaType = source.media_type as string;
        const data = source.data as string;
        parts.push({
          type: "image",
          image: `data:${mediaType};base64,${data}`
        } as ImagePart);
      } else if (source?.type === "url") {
        parts.push({
          type: "image",
          image: source.url as string
        } as ImagePart);
      }
    }
  }

  return parts;
};

/**
 * Parse OpenAI-format messages into AI SDK CoreMessage array.
 * Extracts system messages into a separate field.
 */
const parseMessages = (
  rawMessages: unknown[]
): { messages: CoreMessage[]; system?: string } => {
  const messages: CoreMessage[] = [];
  const systemParts: string[] = [];

  for (const raw of rawMessages) {
    const msg = raw as Record<string, unknown>;
    const role = msg.role as string;

    if (role === "system") {
      // Collect system messages as text
      if (typeof msg.content === "string") {
        systemParts.push(msg.content);
      } else if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          const b = block as Record<string, unknown>;
          if (b.type === "text") systemParts.push(b.text as string);
        }
      }
      continue;
    }

    if (role === "user") {
      const userMsg: CoreUserMessage = {
        role: "user",
        content: parseContentParts(msg.content)
      };
      messages.push(userMsg);
      continue;
    }

    if (role === "assistant") {
      const parts: (TextPart | ToolCallPart)[] = [];

      // Text content
      if (typeof msg.content === "string" && msg.content) {
        parts.push({ type: "text", text: msg.content });
      } else if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          const b = block as Record<string, unknown>;
          if (b.type === "text") {
            parts.push({ type: "text", text: b.text as string });
          }
        }
      }

      // Tool calls
      if (Array.isArray(msg.tool_calls)) {
        for (const tc of msg.tool_calls) {
          const call = tc as Record<string, unknown>;
          const fn = call.function as Record<string, unknown>;
          parts.push({
            type: "tool-call",
            toolCallId: call.id as string,
            toolName: fn.name as string,
            args:
              typeof fn.arguments === "string"
                ? JSON.parse(fn.arguments)
                : fn.arguments
          } as ToolCallPart);
        }
      }

      const assistantMsg: CoreAssistantMessage = {
        role: "assistant",
        content: parts.length === 1 && parts[0]!.type === "text"
          ? parts[0]!.text
          : parts
      };
      messages.push(assistantMsg);
      continue;
    }

    if (role === "tool") {
      const toolMsg: CoreToolMessage = {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: msg.tool_call_id as string,
            result: msg.content
          } as ToolResultPart
        ]
      };
      messages.push(toolMsg);
      continue;
    }
  }

  return {
    messages,
    system: systemParts.length > 0 ? systemParts.join("\n\n") : undefined
  };
};

/**
 * Strip $id and $schema from JSON Schema objects (Mistral rejects these).
 * Applied to all providers since they're non-standard in tool schemas.
 */
const cleanJsonSchema = (schema: unknown): unknown => {
  if (!schema || typeof schema !== "object") return schema;
  const s = { ...(schema as Record<string, unknown>) };
  delete s.$id;
  delete s.$schema;
  // Recurse into properties
  if (s.properties && typeof s.properties === "object") {
    const props = { ...(s.properties as Record<string, unknown>) };
    for (const key of Object.keys(props)) {
      props[key] = cleanJsonSchema(props[key]);
    }
    s.properties = props;
  }
  if (s.items) s.items = cleanJsonSchema(s.items);
  return s;
};

/**
 * Parse OpenAI-format tools array into AI SDK tool definitions.
 */
const parseTools = (
  rawTools: unknown[] | undefined
): Record<string, { description?: string; parameters: unknown }> | undefined => {
  if (!rawTools || rawTools.length === 0) return undefined;

  const tools: Record<string, { description?: string; parameters: unknown }> =
    {};

  for (const raw of rawTools) {
    const t = raw as Record<string, unknown>;

    if (t.type === "function") {
      const fn = t.function as Record<string, unknown>;
      const name = fn.name as string;
      tools[name] = {
        description: fn.description as string | undefined,
        parameters: cleanJsonSchema(fn.parameters) ?? { type: "object", properties: {} }
      };
    }
  }

  return Object.keys(tools).length > 0 ? tools : undefined;
};

/**
 * Parse OpenAI-format tool_choice into AI SDK tool choice.
 */
const parseToolChoice = (
  toolChoice: unknown
): "auto" | "none" | "required" | { toolName: string } | undefined => {
  if (toolChoice === "auto") return "auto";
  if (toolChoice === "none") return "none";
  if (toolChoice === "required") return "required";

  if (typeof toolChoice === "object" && toolChoice !== null) {
    const tc = toolChoice as Record<string, unknown>;
    if (tc.type === "function") {
      const fn = tc.function as Record<string, unknown>;
      return { toolName: fn.name as string };
    }
  }

  return undefined;
};

/**
 * Build provider-specific options from the request body.
 */
const buildProviderOptions = (
  body: Record<string, unknown>,
  provider: string
): Record<string, Record<string, unknown>> | undefined => {
  const options: Record<string, Record<string, unknown>> = {};

  // OpenAI reasoning effort — strip when tools present (Raven-specific business logic)
  const hasTools = Array.isArray(body.tools) && body.tools.length > 0;
  if (body.reasoning_effort && provider === "openai" && !hasTools) {
    options.openai = {
      ...options.openai,
      reasoningEffort: body.reasoning_effort as string
    };
  }

  // Response format passthrough
  if (body.response_format) {
    const format = body.response_format as Record<string, unknown>;
    if (format.type === "json_object" || format.type === "json_schema") {
      options[provider] = {
        ...options[provider],
        responseFormat: body.response_format
      };
    }
  }

  return Object.keys(options).length > 0 ? options : undefined;
};

/**
 * Auto-inject cache control on the last system content part and last tool
 * for Anthropic. This is a Raven value-add — customers get automatic prompt
 * caching without configuring it.
 */
const injectCacheControl = (
  messages: CoreMessage[],
  system: string | undefined,
  tools:
    | Record<string, { description?: string; parameters: unknown }>
    | undefined,
  provider: string
): {
  messages: CoreMessage[];
  system?: string;
  providerOptions?: Record<string, Record<string, unknown>>;
} => {
  if (provider !== "anthropic") {
    return { messages, system };
  }

  // For system prompts, we add cache control via providerOptions on the system
  // AI SDK handles this via the system field with providerOptions
  // For tools, we add cache control on the last tool definition
  const result: Record<string, Record<string, unknown>> = {};

  if (system) {
    result.anthropic = {
      ...result.anthropic,
      cacheControl: { type: "ephemeral" }
    };
  }

  return {
    messages,
    providerOptions:
      Object.keys(result).length > 0 ? result : undefined,
    system
  };
};

/**
 * Main entry point: parse an OpenAI-format request body into AI SDK parameters.
 */
export const parseIncomingRequest = (
  body: Record<string, unknown>,
  provider: string
): ParsedRequest => {
  const rawMessages = (body.messages as unknown[]) ?? [];
  const { messages, system } = parseMessages(rawMessages);

  const tools = parseTools(body.tools as unknown[] | undefined);
  const toolChoice = parseToolChoice(body.tool_choice);

  const providerOptions = buildProviderOptions(body, provider);

  // Auto-inject Anthropic cache control
  const cacheResult = injectCacheControl(messages, system, tools, provider);

  // Merge provider options
  const mergedProviderOptions = {
    ...providerOptions,
    ...cacheResult.providerOptions
  };

  // Parse stream options
  const streamOpts = body.stream_options as Record<string, unknown> | undefined;

  // Parse stop sequences
  let stopSequences: string[] | undefined;
  if (typeof body.stop === "string") {
    stopSequences = [body.stop];
  } else if (Array.isArray(body.stop)) {
    stopSequences = body.stop as string[];
  }

  return {
    frequencyPenalty: body.frequency_penalty as number | undefined,
    isStreaming: body.stream === true,
    maxTokens: (body.max_tokens as number) ??
      (body.max_completion_tokens as number) ??
      undefined,
    messages: cacheResult.messages,
    presencePenalty: body.presence_penalty as number | undefined,
    providerOptions:
      Object.keys(mergedProviderOptions).length > 0
        ? mergedProviderOptions
        : undefined,
    requiresRawProxy: typeof body.n === "number" && body.n > 1,
    responseFormat: body.response_format,
    seed: body.seed as number | undefined,
    stopSequences,
    streamOptions: streamOpts
      ? { includeUsage: streamOpts.include_usage === true }
      : undefined,
    system: cacheResult.system,
    temperature: body.temperature as number | undefined,
    toolChoice,
    tools,
    topP: body.top_p as number | undefined
  };
};
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /Users/yoginth/raven/apps/api && pnpm exec tsc --noEmit --pretty 2>&1 | grep "request-parser" || echo "No errors in request-parser"
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/proxy/request-parser.ts
git commit -m "feat: add AI SDK request parser"
```

---

## Task 6: Create response-formatter.ts

**Files:**
- Create: `apps/api/src/modules/proxy/response-formatter.ts`

Converts AI SDK results back to OpenAI-compatible format for both buffered and streaming responses.

- [ ] **Step 1: Create the response formatter**

```typescript
// apps/api/src/modules/proxy/response-formatter.ts

// No external dependency needed for ID generation
import type { LanguageModelUsage, StreamTextResult, TextStreamPart } from "ai";
import type { TokenUsage } from "./usage-mapper";
import { mapUsage } from "./usage-mapper";

/**
 * Map AI SDK finish reason to OpenAI finish reason.
 */
const mapFinishReason = (
  reason: string | undefined | null
): string => {
  switch (reason) {
    case "stop":
      return "stop";
    case "length":
      return "length";
    case "tool-calls":
      return "tool_calls";
    case "content-filter":
      return "content_filter";
    default:
      return "stop";
  }
};

/**
 * Build OpenAI-format usage object from our TokenUsage.
 */
const buildUsageObject = (
  usage: TokenUsage
): Record<string, unknown> => ({
  completion_tokens: usage.outputTokens,
  prompt_tokens: usage.inputTokens,
  total_tokens: usage.inputTokens + usage.outputTokens,
  ...(usage.reasoningTokens > 0
    ? {
        completion_tokens_details: {
          reasoning_tokens: usage.reasoningTokens
        }
      }
    : {}),
  ...(usage.cacheReadTokens > 0 || usage.cacheWriteTokens > 0
    ? {
        prompt_tokens_details: {
          cached_tokens: usage.cacheReadTokens
        }
      }
    : {})
});

interface BufferedResult {
  text: string;
  finishReason: string | undefined | null;
  usage: LanguageModelUsage;
  toolCalls?: Array<{
    toolCallId: string;
    toolName: string;
    args: unknown;
  }>;
  reasoning?: string;
  model?: string;
}

/**
 * Format a buffered (non-streaming) AI SDK result to OpenAI JSON format.
 */
export const formatBufferedResponse = (
  result: BufferedResult,
  requestedModel: string
): { body: Record<string, unknown>; text: string; usage: TokenUsage } => {
  const tokenUsage = mapUsage(result.usage);
  const model = result.model ?? requestedModel;

  const message: Record<string, unknown> = {
    content: result.text || null,
    role: "assistant"
  };

  // Add tool calls if present
  if (result.toolCalls && result.toolCalls.length > 0) {
    message.tool_calls = result.toolCalls.map((tc) => ({
      function: {
        arguments: JSON.stringify(tc.args),
        name: tc.toolName
      },
      id: tc.toolCallId,
      type: "function"
    }));
  }

  // Add reasoning content if present
  if (result.reasoning) {
    message.reasoning_content = result.reasoning;
  }

  const body: Record<string, unknown> = {
    choices: [
      {
        finish_reason: mapFinishReason(result.finishReason),
        index: 0,
        message
      }
    ],
    created: Math.floor(Date.now() / 1000),
    id: `chatcmpl-${crypto.randomUUID()}`,
    model,
    object: "chat.completion",
    usage: buildUsageObject(tokenUsage)
  };

  return {
    body,
    text: JSON.stringify(body),
    usage: tokenUsage
  };
};

/**
 * Format a streaming AI SDK result to OpenAI SSE format.
 * Returns a ReadableStream that emits OpenAI-compatible SSE events.
 */
export const formatStreamingResponse = (
  fullStream: AsyncIterable<TextStreamPart<Record<string, unknown>>>,
  requestedModel: string,
  includeUsage: boolean,
  onFinish: (usage: TokenUsage) => void
): ReadableStream<Uint8Array> => {
  const encoder = new TextEncoder();
  const completionId = `chatcmpl-${crypto.randomUUID()}`;
  const created = Math.floor(Date.now() / 1000);

  let finalUsage: TokenUsage | null = null;

  const sseChunk = (data: Record<string, unknown>): Uint8Array =>
    encoder.encode(`data: ${JSON.stringify(data)}\n\n`);

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const part of fullStream) {
          if (part.type === "text-delta") {
            controller.enqueue(
              sseChunk({
                choices: [
                  {
                    delta: { content: part.textDelta },
                    index: 0
                  }
                ],
                created,
                id: completionId,
                model: requestedModel,
                object: "chat.completion.chunk"
              })
            );
          } else if (part.type === "reasoning") {
            controller.enqueue(
              sseChunk({
                choices: [
                  {
                    delta: { reasoning_content: part.textDelta },
                    index: 0
                  }
                ],
                created,
                id: completionId,
                model: requestedModel,
                object: "chat.completion.chunk"
              })
            );
          } else if (part.type === "tool-call") {
            controller.enqueue(
              sseChunk({
                choices: [
                  {
                    delta: {
                      tool_calls: [
                        {
                          function: {
                            arguments: JSON.stringify(part.args),
                            name: part.toolName
                          },
                          id: part.toolCallId,
                          index: 0,
                          type: "function"
                        }
                      ]
                    },
                    index: 0
                  }
                ],
                created,
                id: completionId,
                model: requestedModel,
                object: "chat.completion.chunk"
              })
            );
          } else if (part.type === "finish") {
            const finishChunk: Record<string, unknown> = {
              choices: [
                {
                  delta: {},
                  finish_reason: mapFinishReason(part.finishReason),
                  index: 0
                }
              ],
              created,
              id: completionId,
              model: requestedModel,
              object: "chat.completion.chunk"
            };

            // Include usage in the finish chunk if requested
            if (includeUsage && part.usage) {
              finalUsage = mapUsage(part.usage);
              finishChunk.usage = buildUsageObject(finalUsage);
            }

            controller.enqueue(sseChunk(finishChunk));

            if (part.usage) {
              finalUsage = mapUsage(part.usage);
              onFinish(finalUsage);
            }
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        // Format error as SSE event
        const errorData = {
          error: {
            code: "upstream_error",
            message: err instanceof Error ? err.message : "Unknown error"
          }
        };
        controller.enqueue(sseChunk(errorData));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();

        // Still call onFinish with zero usage so logging works
        if (!finalUsage) {
          onFinish({
            cachedTokens: 0,
            cacheReadTokens: 0,
            cacheWriteTokens: 0,
            inputTokens: 0,
            outputTokens: 0,
            reasoningTokens: 0
          });
        }
      }
    }
  });
};

/**
 * Format an AI SDK error into an OpenAI-compatible error response.
 */
export const formatErrorResponse = (
  err: unknown
): { body: string; status: number } => {
  // AI SDK APICallError has statusCode and responseBody
  const error = err as Record<string, unknown>;
  const statusCode = (error.statusCode as number) ??
    (error.status as number) ??
    500;

  // Try to pass through the raw provider error body
  if (error.responseBody && typeof error.responseBody === "string") {
    return { body: error.responseBody, status: statusCode };
  }

  // Fallback to structured error
  const message =
    error.message ?? (err instanceof Error ? err.message : "Internal error");

  return {
    body: JSON.stringify({
      error: {
        code: statusCode >= 500 ? "internal_error" : "upstream_error",
        message
      }
    }),
    status: statusCode
  };
};
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /Users/yoginth/raven/apps/api && pnpm exec tsc --noEmit --pretty 2>&1 | grep "response-formatter" || echo "No errors in response-formatter"
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/proxy/response-formatter.ts
git commit -m "feat: add AI SDK response formatter"
```

---

## Task 7: Update provider-resolver.ts

**Files:**
- Modify: `apps/api/src/modules/proxy/provider-resolver.ts`

Remove adapter creation, return raw credentials instead.

- [ ] **Step 1: Read current file**

Read `apps/api/src/modules/proxy/provider-resolver.ts` to understand the current interface.

- [ ] **Step 2: Modify to return credentials instead of adapter**

Change the return type from including `adapter: ProviderAdapter` to returning raw provider info. Remove the `getProviderAdapter` import. Import `PROVIDERS` from `@/lib/providers`. The resolver should return:

```typescript
export interface ResolvedProvider {
  providerName: string;
  decryptedApiKey: string;
  providerConfigId: string;
  upstreamPath: string;
}
```

Keep all existing logic for path parsing, smart routing, config selection, and key decryption. Only remove the `adapter` field and `getProviderAdapter` call. Note: `baseUrl` is NOT in the DB schema (`providerConfigs` has no `baseUrl` column). The base URL is sourced from the static `PROVIDERS` config in `@/lib/providers.ts` by the handler, not the resolver. The AI SDK providers also default to their standard URLs when no `baseURL` is passed.

- [ ] **Step 3: Verify it compiles** (will have errors in handler.ts — that's expected)

```bash
cd /Users/yoginth/raven/apps/api && pnpm exec tsc --noEmit --pretty 2>&1 | grep -c "error TS" || echo "Checking error count"
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/proxy/provider-resolver.ts
git commit -m "refactor: return raw credentials from provider resolver"
```

---

## Task 8: Update fallback.ts

**Files:**
- Modify: `apps/api/src/modules/proxy/fallback.ts`

Replace adapter-based fallback with AI SDK provider creation. Filter to same-provider only.

- [ ] **Step 1: Rewrite fallback.ts**

Key changes:
- Remove `getProviderAdapter` import
- Remove `ForwardRequestInput`/`ForwardRequestResult` imports
- Add AI SDK imports (`streamText`, `generateText`, `LanguageModel`)
- Import `createProviderModel` from `ai-provider-factory`
- Filter fallback configs to `eq(providerConfigs.provider, primaryProviderName)` — same provider only
- Log a warning when cross-provider configs exist but are skipped: `console.warn(\`Skipping cross-provider fallback: ${config.provider} (only ${primaryProviderName} configs used)\`)`
- The `requestFn` callback now takes a `LanguageModel` and calls AI SDK directly
- Return type changes to include the AI SDK result

New interface:

```typescript
export interface FallbackResult {
  providerConfigId: string;
  providerName: string;
  model: LanguageModel;
  decryptedApiKey: string;
}

export const getFallbackProviders = async (
  db: Database,
  env: Env,
  orgId: string,
  primaryConfigId: string,
  primaryProviderName: string
): Promise<FallbackResult[]>
```

The handler will iterate fallback providers and attempt AI SDK calls. This keeps fallback logic in the handler where it has access to the parsed request.

- [ ] **Step 2: Verify it compiles**

```bash
cd /Users/yoginth/raven/apps/api && pnpm exec tsc --noEmit --pretty 2>&1 | grep "fallback" || echo "No errors in fallback"
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/proxy/fallback.ts
git commit -m "refactor: simplify fallback to return AI SDK provider list"
```

---

## Task 9: Update response-analyzer.ts

**Files:**
- Modify: `apps/api/src/modules/proxy/response-analyzer.ts`

- [ ] **Step 1: Remove Anthropic-native code path**

Remove lines checking for `b.content` array with `type: "tool_use"` blocks (Anthropic native format). After migration, all responses are in OpenAI format, so only the `choices[].message.tool_calls` path is needed.

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/modules/proxy/response-analyzer.ts
git commit -m "refactor: remove dead Anthropic response path from analyzer"
```

---

## Task 10: Rewrite handler.ts

**Files:**
- Modify: `apps/api/src/modules/proxy/handler.ts`

This is the core task. Replace the normalize+fetch+denormalize flow with parse→AI SDK→format.

- [ ] **Step 1: Back up old adapter files**

Move existing provider adapters to `_legacy/` for rollback safety:

```bash
cd /Users/yoginth/raven/apps/api/src/modules/proxy
mkdir -p providers/_legacy
cp -r providers/anthropic providers/_legacy/
cp -r providers/openai providers/_legacy/
cp -r providers/mistral providers/_legacy/
cp providers/types.ts providers/_legacy/
cp providers/registry.ts providers/_legacy/
cp upstream.ts _legacy_upstream.ts
cp response.ts _legacy_response.ts
cp token-usage.ts _legacy_token-usage.ts
cp retry.ts _legacy_retry.ts
```

- [ ] **Step 2: Rewrite handler.ts**

Replace the handler with the new AI SDK flow. Key changes:

**Remove imports:**
- `buildResponse` from `./response`
- `forwardRequest` from `./upstream`
- `extractModel`, `extractTokenUsage`, `StreamTokenAccumulator` from `./token-usage`
- `withRetry` from `./retry`
- `withFallback` from `./fallback`

**Add imports:**
- `streamText`, `generateText`, `tool`, `jsonSchema` from `ai`
- `createProviderModel`, `filterPassthroughHeaders` from `./ai-provider-factory`
- `parseIncomingRequest` from `./request-parser`
- `formatBufferedResponse`, `formatStreamingResponse`, `formatErrorResponse` from `./response-formatter`
- `mapUsage` from `./usage-mapper`
- `estimateCost` from `./cost-estimator`
- `getFallbackProviders` from `./fallback`
- `PROVIDERS` from `@/lib/providers`

**Handler rewrite outline (preserve steps 1-7 unchanged):**

```typescript
// Steps 1-7 unchanged: auth, rate limit, budget, body parse, guardrails,
// routing, model validation, provider resolution, cache check

// 8. Parse request
const parsed = parseIncomingRequest(parsedBody, providerName);

// Guard: n > 1 falls back to raw proxy (out of scope for AI SDK)
if (parsed.requiresRawProxy) {
  // TODO: Keep legacy raw proxy path for n > 1
  // For now, return error
  return c.json({ error: { code: "UNSUPPORTED", message: "n > 1 not supported" } }, 400);
}

// 9. Create AI SDK model
const passthroughHeaders = filterPassthroughHeaders(c.req.header());
const providerBaseUrl = PROVIDERS[providerName]?.baseUrl;
const modelId = (parsedBody.model as string) ?? "unknown";
const aiModel = createProviderModel(
  { provider: providerName, apiKey: decryptedApiKey, baseUrl: providerBaseUrl, headers: passthroughHeaders },
  modelId
);

// 10. Execute via AI SDK
// Wrap tools with AI SDK's tool() + jsonSchema() helpers
const aiSdkTools = parsed.tools
  ? Object.fromEntries(
      Object.entries(parsed.tools).map(([name, def]) => [
        name,
        tool({
          description: def.description,
          parameters: jsonSchema(def.parameters as Record<string, unknown>)
        })
      ])
    )
  : undefined;

const aiSdkParams = {
  frequencyPenalty: parsed.frequencyPenalty,
  maxRetries: 2,
  maxTokens: parsed.maxTokens,
  messages: parsed.messages,
  model: aiModel,
  presencePenalty: parsed.presencePenalty,
  providerOptions: parsed.providerOptions,
  seed: parsed.seed,
  stopSequences: parsed.stopSequences,
  system: parsed.system,
  temperature: parsed.temperature,
  toolChoice: parsed.toolChoice,
  tools: aiSdkTools,
  topP: parsed.topP
};

// Helper to execute AI SDK call and build response.
// Used by both primary and fallback paths to avoid duplication.
const executeCall = async (callModel: LanguageModel, provName: string, configId: string) => { ... };
// (Extract the full streaming + buffered logic into this helper)

try {
  if (parsed.isStreaming) {
    // Streaming path — streamText() returns synchronously, errors surface during consumption.
    // We must consume at least the first event to detect upstream errors before committing to stream.
    const result = streamText({ ...aiSdkParams, model: aiModel }); // NOTE: no await

    const responseHeaders: Record<string, string> = {
      "cache-control": "no-cache",
      "content-type": "text/event-stream"
    };
    if (guardrailWarnings.length > 0) {
      responseHeaders["X-Guardrail-Warnings"] = guardrailWarnings.join("; ");
    }

    const stream = formatStreamingResponse(
      result.fullStream,
      parsedBody.model as string,
      parsed.streamOptions?.includeUsage ?? false,
      (usage) => {
        // Deferred: log and update metrics
        logData.inputTokens = usage.inputTokens;
        logData.outputTokens = usage.outputTokens;
        logData.reasoningTokens = usage.reasoningTokens;
        logData.cachedTokens = usage.cachedTokens;
        logData.cost = estimateCost(finalProviderName, logData.model, usage);

        logAndPublish(db, logData, { redis, teamId: virtualKey.teamId });
        updateLastUsed(redis, virtualKey.id);
        void updateMetrics(redis, finalProviderConfigId, latencyMs, logData.cost);
      }
    );

    return new Response(stream, { headers: responseHeaders, status: 200 });
  } else {
    // Buffered path
    const result = await generateText(aiSdkParams);

    const formatted = formatBufferedResponse(
      {
        finishReason: result.finishReason,
        reasoning: result.reasoning,
        text: result.text,
        toolCalls: result.toolCalls,
        usage: result.usage
      },
      parsedBody.model as string
    );

    // Deferred logging
    void (() => {
      const responseAnalysis = analyzeResponse(formatted.body);
      if (responseAnalysis.hasToolCalls) {
        logData.hasToolUse = true;
        logData.toolCount += responseAnalysis.toolCallCount;
        logData.toolNames.push(...responseAnalysis.toolCallNames);
      }

      logData.inputTokens = formatted.usage.inputTokens;
      logData.outputTokens = formatted.usage.outputTokens;
      logData.reasoningTokens = formatted.usage.reasoningTokens;
      logData.cachedTokens = formatted.usage.cachedTokens;
      logData.cost = estimateCost(finalProviderName, logData.model, formatted.usage);

      void storeCache(redis, virtualKey.organizationId, finalProviderName, requestBody, formatted.text);
      logAndPublish(db, logData, { redis, teamId: virtualKey.teamId });
      updateLastUsed(redis, virtualKey.id);
      void updateMetrics(redis, finalProviderConfigId, latencyMs, logData.cost);
    })();

    const responseHeaders: Record<string, string> = { "content-type": "application/json" };
    if (guardrailWarnings.length > 0) {
      responseHeaders["X-Guardrail-Warnings"] = guardrailWarnings.join("; ");
    }

    return new Response(formatted.text, { headers: responseHeaders, status: 200 });
  }
} catch (err) {
  // Attempt fallback
  const fallbacks = await getFallbackProviders(db, env, virtualKey.organizationId, providerConfigId, providerName);

  for (const fb of fallbacks) {
    try {
      const fbModel = createProviderModel(
        { provider: fb.providerName, apiKey: fb.decryptedApiKey, headers: passthroughHeaders },
        parsedBody.model as string
      );

      if (parsed.isStreaming) {
        const result = await streamText({ ...aiSdkParams, model: fbModel });
        // ... same streaming response logic with fb provider info
        finalProviderConfigId = fb.providerConfigId;
        finalProviderName = fb.providerName;
        // Return streaming response
      } else {
        const result = await generateText({ ...aiSdkParams, model: fbModel });
        // ... same buffered response logic with fb provider info
        finalProviderConfigId = fb.providerConfigId;
        finalProviderName = fb.providerName;
        // Return buffered response
      }
    } catch {
      continue; // Try next fallback
    }
  }

  // All fallbacks failed — return error
  const { body, status } = formatErrorResponse(err);
  logData.statusCode = status;
  logAndPublish(db, logData, { redis, teamId: virtualKey.teamId });
  return new Response(body, { headers: { "content-type": "application/json" }, status });
}
```

- [ ] **Step 3: Verify it compiles**

```bash
cd /Users/yoginth/raven/apps/api && pnpm exec tsc --noEmit --pretty 2>&1 | tail -20
```

Fix any type errors.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/proxy/handler.ts
git commit -m "feat: rewrite proxy handler to use AI SDK"
```

---

## Task 11: Update openai-compat handler

**Files:**
- Modify: `apps/api/src/modules/openai-compat/handler.ts`

- [ ] **Step 1: Read the current openai-compat handler**

This handler is similar to the proxy handler but resolves model → provider internally. Apply the same AI SDK migration pattern:
- Replace adapter usage with `createProviderModel`
- Replace normalize+fetch with `parseIncomingRequest` → AI SDK → `formatBufferedResponse`/`formatStreamingResponse`
- Keep the model resolution logic unchanged

- [ ] **Step 2: Rewrite to use AI SDK flow**

Same pattern as Task 10 but using the openai-compat handler's model resolution logic.

- [ ] **Step 3: Verify it compiles**

```bash
cd /Users/yoginth/raven/apps/api && pnpm exec tsc --noEmit --pretty 2>&1 | tail -20
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/openai-compat/handler.ts
git commit -m "feat: rewrite openai-compat handler to use AI SDK"
```

---

## Task 12: Delete legacy adapter code

**Files:**
- Delete: `providers/anthropic/chat.ts`, `providers/anthropic/index.ts`
- Delete: `providers/openai/chat.ts`, `providers/openai/index.ts`
- Delete: `providers/mistral/chat.ts`, `providers/mistral/index.ts`
- Delete: `providers/types.ts`, `providers/registry.ts`
- Delete: `upstream.ts`, `response.ts`, `token-usage.ts`, `retry.ts`

- [ ] **Step 1: Verify no imports reference deleted files**

```bash
cd /Users/yoginth/raven/apps/api && grep -r "from.*providers/registry" src/ --include="*.ts" | grep -v "_legacy"
grep -r "from.*\./upstream" src/modules/proxy/ --include="*.ts" | grep -v "_legacy"
grep -r "from.*\./response\"" src/modules/proxy/ --include="*.ts" | grep -v "_legacy"
grep -r "from.*\./token-usage" src/modules/proxy/ --include="*.ts" | grep -v "_legacy"
grep -r "from.*\./retry" src/modules/proxy/ --include="*.ts" | grep -v "_legacy"
```

Expected: No results (all imports should be updated by now).

- [ ] **Step 2: Delete legacy files**

```bash
cd /Users/yoginth/raven/apps/api/src/modules/proxy
rm providers/anthropic/chat.ts providers/anthropic/index.ts
rm providers/openai/chat.ts providers/openai/index.ts
rm providers/mistral/chat.ts providers/mistral/index.ts
rm providers/types.ts providers/registry.ts
rm upstream.ts response.ts token-usage.ts retry.ts
# Remove empty provider directories
rmdir providers/anthropic providers/openai providers/mistral 2>/dev/null || true
```

- [ ] **Step 3: Verify p-retry is still needed**

`p-retry` is still used by `webhook-dispatcher.ts` — do NOT remove it.

```bash
cd /Users/yoginth/raven && grep -r "p-retry" apps/api/src/ --include="*.ts" | grep -v "_legacy"
```

Expected: Should show `webhook-dispatcher.ts` as a remaining user.

- [ ] **Step 4: Full compilation check**

```bash
cd /Users/yoginth/raven/apps/api && pnpm exec tsc --noEmit --pretty
```

Expected: Clean compilation.

- [ ] **Step 5: Commit**

```bash
cd /Users/yoginth/raven/apps/api/src/modules/proxy
git add -A .
git add ../../openai-compat/
cd /Users/yoginth/raven
git commit -m "refactor: delete legacy provider adapters and normalization code"
```

---

## Task 13: Clean up legacy backups

**Files:**
- Delete: `providers/_legacy/` directory
- Delete: `_legacy_*.ts` files

Only do this after verifying the new code works.

- [ ] **Step 1: Delete legacy backups**

```bash
cd /Users/yoginth/raven/apps/api/src/modules/proxy
rm -rf providers/_legacy _legacy_upstream.ts _legacy_response.ts _legacy_token-usage.ts _legacy_retry.ts
```

- [ ] **Step 2: Final compilation check**

```bash
cd /Users/yoginth/raven/apps/api && pnpm exec tsc --noEmit --pretty
```

- [ ] **Step 3: Commit**

```bash
cd /Users/yoginth/raven/apps/api/src/modules/proxy
git add -A .
cd /Users/yoginth/raven
git commit -m "chore: remove legacy adapter backups"
```

---

## Task 14: Verify the full build

- [ ] **Step 1: Run full build**

```bash
cd /Users/yoginth/raven && pnpm build
```

- [ ] **Step 2: Run linter**

```bash
cd /Users/yoginth/raven && pnpm lint
```

Fix any lint issues.

- [ ] **Step 3: Fix and commit any remaining issues**

```bash
git add -A && git commit -m "fix: resolve build and lint issues"
```

---

## Execution Order and Dependencies

```
Task 1 (install deps) — no dependencies
  ↓
Task 2 (usage-mapper) — depends on Task 1
Task 3 (cost-estimator) — depends on Task 2
Task 4 (provider-factory) — depends on Task 1
Task 5 (request-parser) — depends on Task 1
Task 6 (response-formatter) — depends on Task 2
  ↓ (all new files ready)
Task 7 (provider-resolver) — depends on Task 4
Task 8 (fallback) — depends on Task 4
Task 9 (response-analyzer) — no dependencies
  ↓
Task 10 (handler rewrite) — depends on Tasks 2-9
Task 11 (openai-compat) — depends on Tasks 2-9
  ↓
Task 12 (delete legacy) — depends on Tasks 10-11
Task 13 (clean backups) — depends on Task 12
Task 14 (verify build) — depends on Task 13
```

**Parallelizable:** Tasks 2+4+5 can run in parallel. Tasks 3+6 can run in parallel after Task 2. Tasks 7+8+9 can run in parallel. Tasks 10+11 can run in parallel.
