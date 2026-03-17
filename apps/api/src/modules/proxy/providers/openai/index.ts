import { getModelPricing } from "@/lib/pricing-cache";
import { PROVIDERS } from "@/lib/providers";
import type { ProviderAdapter } from "../types";
import { normalizeRequest } from "./chat";

export const createOpenAIAdapter = (provider: string): ProviderAdapter => {
  const config = PROVIDERS[provider];
  if (!config) throw new Error(`Unknown provider: ${provider}`);

  return {
    baseUrl: config.baseUrl,
    capabilities: [
      "audio-speech",
      "audio-transcription",
      "chat",
      "embeddings",
      "files",
      "image-generation",
      "models",
      "moderations"
    ],
    chatEndpoint: config.chatEndpoint,
    estimateCost(
      model: string,
      inputTokens: number,
      outputTokens: number,
      cacheReadTokens = 0
    ): number {
      const pricing = getModelPricing(model, provider);
      const regularInput = Math.max(0, inputTokens - cacheReadTokens);
      const regularInputCost = (regularInput / 1_000_000) * pricing.input;
      const cachedInputCost =
        (cacheReadTokens / 1_000_000) * pricing.input * 0.5;
      const outputCost = (outputTokens / 1_000_000) * pricing.output;
      return regularInputCost + cachedInputCost + outputCost;
    },
    modelsEndpoint: config.modelsEndpoint,
    name: provider,
    normalizeRequest,
    transformHeaders(
      apiKey: string,
      headers: Record<string, string>
    ): Record<string, string> {
      return { ...headers, ...config.authHeaders(apiKey) };
    }
  };
};
