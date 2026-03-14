import { PROVIDERS } from "@/lib/providers";
import type { ProviderAdapter } from "./registry";

const config = PROVIDERS.openai!;

const PRICING: Record<string, { input: number; output: number }> = {
  "gpt-3.5-turbo": { input: 0.5, output: 1.5 },
  "gpt-4": { input: 30, output: 60 },
  "gpt-4-turbo": { input: 5, output: 15 },
  "gpt-4.1": { input: 2, output: 8 },
  "gpt-4.1-mini": { input: 0.2, output: 0.8 },
  "gpt-4.1-nano": { input: 0.05, output: 0.2 },
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-5": { input: 1.25, output: 10 },
  "gpt-5-mini": { input: 0.125, output: 1 },
  "gpt-5-nano": { input: 0.05, output: 0.4 },
  "gpt-5.1": { input: 0.625, output: 5 },
  "gpt-5.2": { input: 0.875, output: 7 },
  "gpt-5.4": { input: 2.5, output: 15 },
  o1: { input: 15, output: 60 },
  "o1-mini": { input: 0.55, output: 2.2 },
  o3: { input: 2, output: 8 },
  "o3-mini": { input: 1.1, output: 4.4 },
  "o4-mini": { input: 1.1, output: 4.4 },
  "text-embedding-3-large": { input: 0.13, output: 0 },
  "text-embedding-3-small": { input: 0.02, output: 0 },
  "text-embedding-ada-002": { input: 0.1, output: 0 }
};

export const openaiAdapter: ProviderAdapter = {
  baseUrl: config.baseUrl,

  estimateCost(model, inputTokens, outputTokens) {
    const pricing = PRICING[model] ?? { input: 2.5, output: 10 };
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    return inputCost + outputCost;
  },
  name: "openai",

  transformHeaders(apiKey, headers) {
    return {
      ...headers,
      ...config.authHeaders(apiKey)
    };
  }
};
