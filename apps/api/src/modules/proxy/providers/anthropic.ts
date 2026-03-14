import { getModelPricing } from "@/lib/pricing-cache";
import { PROVIDERS } from "@/lib/providers";
import type { ProviderAdapter } from "./registry";

const config = PROVIDERS.anthropic!;

export const anthropicAdapter: ProviderAdapter = {
  baseUrl: config.baseUrl,

  estimateCost(model, inputTokens, outputTokens) {
    const pricing = getModelPricing(model, "anthropic");
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
