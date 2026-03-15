import { getModelPricing } from "@/lib/pricing-cache";
import { PROVIDERS } from "@/lib/providers";
import { anthropicAdapter } from "./anthropic";

export interface ProviderAdapter {
  name: string;
  baseUrl: string;
  chatEndpoint: string;
  modelsEndpoint: string;
  transformHeaders(
    apiKey: string,
    headers: Record<string, string>
  ): Record<string, string>;
  transformBody?(body: Record<string, unknown>): Record<string, unknown>;
  normalizeRequest?(body: Record<string, unknown>): Record<string, unknown>;
  normalizeStreamChunk?(line: string): string | null;
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
    chatEndpoint: config?.chatEndpoint ?? "/chat/completions",

    estimateCost(model, inputTokens, outputTokens, cacheReadTokens = 0) {
      const pricing = getModelPricing(model, provider);
      const regularInput = Math.max(0, inputTokens - cacheReadTokens);
      const regularInputCost = (regularInput / 1_000_000) * pricing.input;
      const cachedInputCost =
        (cacheReadTokens / 1_000_000) * pricing.input * 0.5;
      const outputCost = (outputTokens / 1_000_000) * pricing.output;
      return regularInputCost + cachedInputCost + outputCost;
    },
    modelsEndpoint: config?.modelsEndpoint ?? "/models",
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
  if (PROVIDERS[provider]?.chatEndpoint === "/messages") {
    return anthropicAdapter(provider);
  }
  return createOpenAICompatibleAdapter(provider);
};
