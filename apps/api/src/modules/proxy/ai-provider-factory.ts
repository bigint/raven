import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export interface ProviderFactoryInput {
  provider: string;
  apiKey: string;
  baseUrl?: string;
  headers?: Record<string, string>;
}

const STRIPPED_HEADERS = new Set([
  "authorization",
  "connection",
  "content-length",
  "host",
  "origin",
  "referer",
  "sec-ch-ua",
  "sec-ch-ua-mobile",
  "sec-ch-ua-platform",
  "sec-fetch-dest",
  "sec-fetch-mode",
  "sec-fetch-site",
  "transfer-encoding",
  "user-agent"
]);

export const filterPassthroughHeaders = (
  headers: Record<string, string>
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(headers).filter(
      ([k]) => !STRIPPED_HEADERS.has(k.toLowerCase())
    )
  );

/**
 * Creates an AI SDK LanguageModel for the given provider and model ID.
 *
 * Each call creates a fresh provider instance with the provided credentials.
 * The AI SDK handles API version headers, endpoint mapping, and auth internally.
 */
export const createProviderModel = (
  input: ProviderFactoryInput,
  modelId: string
): LanguageModel => {
  const { apiKey, baseUrl, headers, provider } = input;

  switch (provider) {
    case "anthropic": {
      const p = createAnthropic({ apiKey, baseURL: baseUrl, headers });
      return p(modelId);
    }
    case "google": {
      const p = createGoogleGenerativeAI({ apiKey, baseURL: baseUrl, headers });
      return p(modelId);
    }
    case "openai": {
      const p = createOpenAI({ apiKey, baseURL: baseUrl, headers });
      return p.chat(modelId);
    }
    default: {
      // Unknown providers: assume OpenAI-compatible API
      const p = createOpenAI({
        apiKey,
        baseURL: baseUrl,
        headers
      });
      return p.chat(modelId);
    }
  }
};
