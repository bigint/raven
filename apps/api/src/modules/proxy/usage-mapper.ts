import type { LanguageModelUsage } from "ai";

export interface TokenUsage {
  cachedTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
}

const ZERO_USAGE: TokenUsage = {
  cachedTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  inputTokens: 0,
  outputTokens: 0,
  reasoningTokens: 0
};

/**
 * Maps AI SDK LanguageModelUsage to our TokenUsage interface.
 * Uses AI SDK normalized fields first, falls back to raw provider data.
 */
export const mapUsage = (usage: LanguageModelUsage): TokenUsage => {
  const inputTokens = usage.inputTokens ?? 0;
  const outputTokens = usage.outputTokens ?? 0;

  let cacheReadTokens = usage.inputTokenDetails?.cacheReadTokens ?? 0;
  let cacheWriteTokens = usage.inputTokenDetails?.cacheWriteTokens ?? 0;
  let reasoningTokens = usage.outputTokenDetails?.reasoningTokens ?? 0;

  // Fall back to raw provider data when AI SDK fields are absent
  const raw = usage.raw as Record<string, unknown> | undefined;
  if (raw) {
    if (cacheReadTokens === 0) {
      // Anthropic: cache_read_input_tokens
      cacheReadTokens =
        (raw.cache_read_input_tokens as number) ?? cacheReadTokens;
      // OpenAI: prompt_tokens_details.cached_tokens
      const promptDetails = raw.prompt_tokens_details as
        | Record<string, unknown>
        | undefined;
      if (promptDetails) {
        cacheReadTokens =
          (promptDetails.cached_tokens as number) ?? cacheReadTokens;
      }
    }

    if (cacheWriteTokens === 0) {
      cacheWriteTokens =
        (raw.cache_creation_input_tokens as number) ?? cacheWriteTokens;
    }

    if (reasoningTokens === 0) {
      const completionDetails = raw.completion_tokens_details as
        | Record<string, unknown>
        | undefined;
      if (completionDetails) {
        reasoningTokens =
          (completionDetails.reasoning_tokens as number) ?? reasoningTokens;
      }
    }
  }

  return {
    cachedTokens: cacheReadTokens + cacheWriteTokens,
    cacheReadTokens,
    cacheWriteTokens,
    inputTokens,
    outputTokens,
    reasoningTokens
  };
};

/**
 * Extract token usage from an OpenAI-format cached response body.
 * Used only for the cache-hit path where we have stored JSON, not an AI SDK result.
 */
export const extractCachedUsage = (
  body: Record<string, unknown>
): TokenUsage => {
  const usage = body.usage as Record<string, unknown> | undefined;
  if (!usage) return { ...ZERO_USAGE };

  const inputTokens =
    (usage.prompt_tokens as number) ?? (usage.input_tokens as number) ?? 0;
  const outputTokens =
    (usage.completion_tokens as number) ?? (usage.output_tokens as number) ?? 0;

  const completionDetails = usage.completion_tokens_details as
    | Record<string, unknown>
    | undefined;
  const reasoningTokens = (completionDetails?.reasoning_tokens as number) ?? 0;

  const promptDetails = usage.prompt_tokens_details as
    | Record<string, unknown>
    | undefined;
  const cacheReadTokens = (promptDetails?.cached_tokens as number) ?? 0;

  return {
    cachedTokens: cacheReadTokens,
    cacheReadTokens,
    cacheWriteTokens: 0,
    inputTokens,
    outputTokens,
    reasoningTokens
  };
};

export const extractModel = (
  body: Record<string, unknown>,
  fallback: string
): string => (body.model as string) ?? fallback;
