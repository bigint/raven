export type ProviderCapability =
  | "audio-speech"
  | "audio-transcription"
  | "chat"
  | "embeddings"
  | "files"
  | "image-generation"
  | "moderations"
  | "models"
  | "ocr";

export interface ProviderAdapter {
  readonly name: string;
  readonly baseUrl: string;
  readonly chatEndpoint: string;
  readonly modelsEndpoint: string;
  readonly capabilities: readonly ProviderCapability[];

  /** Set auth headers for the provider */
  transformHeaders(
    apiKey: string,
    headers: Record<string, string>
  ): Record<string, string>;

  /** Convert OpenAI-format request to provider-native format (chat only) */
  normalizeRequest?(body: Record<string, unknown>): Record<string, unknown>;

  /** Convert provider-native buffered response to OpenAI format (chat only) */
  normalizeResponse?(body: Record<string, unknown>): Record<string, unknown>;

  /** Apply provider-specific post-processing (e.g., cache control injection) */
  transformBody?(body: Record<string, unknown>): Record<string, unknown>;

  /** Convert provider-native SSE chunks to OpenAI SSE format */
  normalizeStreamChunk?(line: string): string | null;

  /** Map OpenAI-style endpoint path to provider-specific endpoint path */
  mapEndpoint?(endpoint: string): string;

  /** Estimate cost in USD */
  estimateCost(
    model: string,
    inputTokens: number,
    outputTokens: number,
    cacheReadTokens?: number,
    cacheWriteTokens?: number
  ): number;
}
