import { anthropicAdapter } from "./anthropic";
import { openaiAdapter } from "./openai";

export interface ProviderAdapter {
  name: string;
  baseUrl: string;
  transformHeaders(
    apiKey: string,
    headers: Record<string, string>
  ): Record<string, string>;
  estimateCost(
    model: string,
    inputTokens: number,
    outputTokens: number
  ): number;
}

const ADAPTERS: Record<string, ProviderAdapter> = {
  anthropic: anthropicAdapter,
  openai: openaiAdapter
};

export const getProviderAdapter = (provider: string): ProviderAdapter => {
  const adapter = ADAPTERS[provider];
  if (!adapter) {
    throw new Error(`Unknown provider: ${provider}`);
  }
  return adapter;
};

export const getSupportedProviders = (): string[] => Object.keys(ADAPTERS);
