import { PROVIDERS } from "../../../lib/providers";
import type { ProviderAdapter } from "./registry";

const config = PROVIDERS.anthropic!;

const PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-20250514": { input: 3, output: 15 }
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
