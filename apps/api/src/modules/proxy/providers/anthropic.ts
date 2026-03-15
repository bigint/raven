import { getModelPricing } from "@/lib/pricing-cache";
import { PROVIDERS } from "@/lib/providers";
import type { ProviderAdapter } from "./registry";

const config = PROVIDERS.anthropic!;

export const anthropicAdapter: ProviderAdapter = {
  baseUrl: config.baseUrl,

  estimateCost(model, inputTokens, outputTokens, cacheReadTokens = 0, cacheWriteTokens = 0) {
    const pricing = getModelPricing(model, "anthropic");
    const regularInput = inputTokens - cacheReadTokens - cacheWriteTokens;
    const regularInputCost = (regularInput / 1_000_000) * pricing.input;
    const cacheWriteCost = (cacheWriteTokens / 1_000_000) * pricing.input * 1.25;
    const cacheReadCost = (cacheReadTokens / 1_000_000) * pricing.input * 0.1;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    return regularInputCost + cacheWriteCost + cacheReadCost + outputCost;
  },
  name: "anthropic",

  transformHeaders(apiKey, headers) {
    return {
      ...headers,
      ...config.authHeaders(apiKey)
    };
  }
};
