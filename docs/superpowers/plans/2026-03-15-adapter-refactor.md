# Provider Adapter Refactor Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded per-provider adapters with a data-driven registry so any OpenAI-compatible provider works through the proxy.

**Architecture:** Expand the `PROVIDERS` map with all known provider metadata, replace the hardcoded `ADAPTERS` map with a factory function that returns Anthropic's adapter for "anthropic" and a dynamically-created OpenAI-compatible adapter for everything else, then delete the now-redundant `openai.ts` adapter file.

**Tech Stack:** TypeScript, Hono

**Spec:** `docs/superpowers/specs/2026-03-15-adapter-refactor-design.md`

---

## Chunk 1: Implementation

### Task 1: Expand PROVIDERS map

**Files:**
- Modify: `apps/api/src/lib/providers.ts`

- [ ] **Step 1: Add 9 new provider entries**

Add these entries to the `PROVIDERS` object after the existing `openai` entry. All use the same OpenAI-compatible pattern — Bearer auth and `/models` validation:

```ts
cerebras: {
  authHeaders: (apiKey) => ({ Authorization: `Bearer ${apiKey}` }),
  baseUrl: "https://api.cerebras.ai/v1",
  label: "Cerebras",
  validationPath: "/models"
},
deepseek: {
  authHeaders: (apiKey) => ({ Authorization: `Bearer ${apiKey}` }),
  baseUrl: "https://api.deepseek.com/v1",
  label: "DeepSeek",
  validationPath: "/models"
},
fireworks: {
  authHeaders: (apiKey) => ({ Authorization: `Bearer ${apiKey}` }),
  baseUrl: "https://api.fireworks.ai/inference/v1",
  label: "Fireworks AI",
  validationPath: "/models"
},
groq: {
  authHeaders: (apiKey) => ({ Authorization: `Bearer ${apiKey}` }),
  baseUrl: "https://api.groq.com/openai/v1",
  label: "Groq",
  validationPath: "/models"
},
mistralai: {
  authHeaders: (apiKey) => ({ Authorization: `Bearer ${apiKey}` }),
  baseUrl: "https://api.mistral.ai/v1",
  label: "Mistral AI",
  validationPath: "/models"
},
perplexity: {
  authHeaders: (apiKey) => ({ Authorization: `Bearer ${apiKey}` }),
  baseUrl: "https://api.perplexity.ai",
  label: "Perplexity",
  validationPath: "/models"
},
sambanova: {
  authHeaders: (apiKey) => ({ Authorization: `Bearer ${apiKey}` }),
  baseUrl: "https://api.sambanova.ai/v1",
  label: "SambaNova",
  validationPath: "/models"
},
together: {
  authHeaders: (apiKey) => ({ Authorization: `Bearer ${apiKey}` }),
  baseUrl: "https://api.together.xyz/v1",
  label: "Together AI",
  validationPath: "/models"
},
"x-ai": {
  authHeaders: (apiKey) => ({ Authorization: `Bearer ${apiKey}` }),
  baseUrl: "https://api.x.ai/v1",
  label: "xAI",
  validationPath: "/models"
},
```

Keep entries in alphabetical order (anthropic, cerebras, deepseek, fireworks, groq, mistralai, openai, perplexity, sambanova, together, x-ai).

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/lib/providers.ts
git commit -m "feat: add provider metadata for 9 new OpenAI-compatible providers"
```

---

### Task 2: Replace adapter registry with factory function

**Files:**
- Modify: `apps/api/src/modules/proxy/providers/registry.ts`
- Delete: `apps/api/src/modules/proxy/providers/openai.ts`

- [ ] **Step 1: Rewrite registry.ts**

Replace the entire file with:

```ts
import { getModelPricing } from "@/lib/pricing-cache";
import { PROVIDERS } from "@/lib/providers";
import { anthropicAdapter } from "./anthropic";

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

const DEFAULT_AUTH_HEADERS = (apiKey: string): Record<string, string> => ({
  Authorization: `Bearer ${apiKey}`
});

const createOpenAICompatibleAdapter = (provider: string): ProviderAdapter => {
  const config = PROVIDERS[provider];

  return {
    baseUrl: config?.baseUrl ?? "https://api.openai.com/v1",

    estimateCost(model, inputTokens, outputTokens, cacheReadTokens = 0) {
      const pricing = getModelPricing(model, provider);
      const regularInput = Math.max(0, inputTokens - cacheReadTokens);
      const regularInputCost = (regularInput / 1_000_000) * pricing.input;
      const cachedInputCost =
        (cacheReadTokens / 1_000_000) * pricing.input * 0.5;
      const outputCost = (outputTokens / 1_000_000) * pricing.output;
      return regularInputCost + cachedInputCost + outputCost;
    },
    name: provider,

    transformHeaders(apiKey, headers) {
      const authFn = config?.authHeaders ?? DEFAULT_AUTH_HEADERS;
      return {
        ...headers,
        ...authFn(apiKey)
      };
    }
  };
};

export const getProviderAdapter = (provider: string): ProviderAdapter => {
  if (provider === "anthropic") return anthropicAdapter;
  return createOpenAICompatibleAdapter(provider);
};
```

- [ ] **Step 2: Delete openai.ts**

```bash
rm apps/api/src/modules/proxy/providers/openai.ts
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/yoginth/raven && pnpm typecheck`
Expected: Clean — no other file imports from `openai.ts` directly; they all go through the registry.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/proxy/providers/registry.ts
git rm apps/api/src/modules/proxy/providers/openai.ts
git commit -m "feat: replace hardcoded adapter map with dynamic factory for any provider"
```

---

### Task 3: Final verification

**Files:** None (verification only)

- [ ] **Step 1: Run typecheck**

Run: `cd /Users/yoginth/raven && pnpm typecheck`
Expected: All packages pass.

- [ ] **Step 2: Run lint on changed files**

Run: `npx biome check --write apps/api/src/lib/providers.ts apps/api/src/modules/proxy/providers/registry.ts`
Expected: No new errors (only pre-existing non-null assertion warning in anthropic.ts).
