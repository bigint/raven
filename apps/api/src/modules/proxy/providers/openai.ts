import { getModelPricing } from "@/lib/pricing-cache";
import { PROVIDERS } from "@/lib/providers";
import type { ProviderAdapter } from "./registry";

const config = PROVIDERS.openai!;

export const openaiAdapter: ProviderAdapter = {
  baseUrl: config.baseUrl,

  estimateCost(model, inputTokens, outputTokens, cacheReadTokens = 0) {
    const pricing = getModelPricing(model, "openai");
    const regularInput = inputTokens - cacheReadTokens;
    const regularInputCost = (regularInput / 1_000_000) * pricing.input;
    const cachedInputCost = (cacheReadTokens / 1_000_000) * pricing.input * 0.5;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    return regularInputCost + cachedInputCost + outputCost;
  },
  name: "openai",

  transformHeaders(apiKey, headers) {
    return {
      ...headers,
      ...config.authHeaders(apiKey)
    };
  }
};
