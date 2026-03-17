import { PROVIDERS } from "@/lib/providers";
import type { ProviderAdapter } from "../types";
import {
  createStreamNormalizer,
  estimateCost,
  mapEndpoint,
  normalizeRequest,
  normalizeResponse,
  transformBody
} from "./chat";

export const createAnthropicAdapter = (provider: string): ProviderAdapter => {
  const config = PROVIDERS[provider];
  if (!config) throw new Error(`Unknown provider: ${provider}`);

  const streamNormalizer = createStreamNormalizer();

  return {
    baseUrl: config.baseUrl,
    capabilities: ["chat", "files", "models"],
    chatEndpoint: config.chatEndpoint,
    estimateCost(
      model: string,
      inputTokens: number,
      outputTokens: number,
      cacheReadTokens = 0,
      cacheWriteTokens = 0
    ): number {
      return estimateCost(
        provider,
        model,
        inputTokens,
        outputTokens,
        cacheReadTokens,
        cacheWriteTokens
      );
    },
    mapEndpoint,
    modelsEndpoint: config.modelsEndpoint,
    name: provider,
    normalizeRequest,
    normalizeResponse,
    normalizeStreamChunk: streamNormalizer,
    transformBody,
    transformHeaders(
      apiKey: string,
      headers: Record<string, string>
    ): Record<string, string> {
      return { ...headers, ...config.authHeaders(apiKey) };
    }
  };
};
