import { createAnthropicAdapter } from "./anthropic";
import { createMistralAdapter } from "./mistral";
import { createOpenAIAdapter } from "./openai";
import type { ProviderAdapter } from "./types";

export type { ProviderAdapter } from "./types";

/**
 * Creates a fresh adapter per call. Do NOT cache or memoize — some adapters
 * (e.g. Anthropic) hold per-stream mutable state in normalizeStreamChunk.
 */
export const getProviderAdapter = (provider: string): ProviderAdapter => {
  switch (provider) {
    case "anthropic":
      return createAnthropicAdapter(provider);
    case "mistralai":
      return createMistralAdapter(provider);
    case "openai":
      return createOpenAIAdapter(provider);
    default:
      return createOpenAIAdapter(provider);
  }
};
