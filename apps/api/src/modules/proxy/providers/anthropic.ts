import { PROVIDERS } from "@/lib/providers";
import type { ProviderAdapter } from "./registry";

const config = PROVIDERS.anthropic!;

const PRICING: Record<string, { input: number; output: number }> = {
  // Latest generation
  "claude-haiku-4-5-20251001": { input: 1, output: 5 },
  "claude-opus-4-6": { input: 5, output: 25 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  // Legacy
  "claude-opus-4-1-20250805": { input: 15, output: 75 },
  "claude-opus-4-20250514": { input: 15, output: 75 },
  "claude-opus-4-5-20251101": { input: 5, output: 25 },
  "claude-sonnet-4-20250514": { input: 3, output: 15 },
  "claude-sonnet-4-5-20250929": { input: 3, output: 15 }
};

export const anthropicAdapter: ProviderAdapter = {
  baseUrl: config.baseUrl,

  estimateCost(model, inputTokens, outputTokens) {
    const pricing = PRICING[model] ?? { input: 3, output: 15 };
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    return inputCost + outputCost;
  },
  name: "anthropic",

  transformHeaders(apiKey, headers) {
    return {
      ...headers,
      ...config.authHeaders(apiKey)
    };
  }
};
