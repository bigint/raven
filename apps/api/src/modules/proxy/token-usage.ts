export interface TokenUsage {
  cachedTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
}

export const extractTokenUsage = (
  body: Record<string, unknown>
): TokenUsage => {
  const usage = body.usage as Record<string, unknown> | undefined;
  if (!usage)
    return {
      cachedTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0
    };

  // OpenAI format: prompt_tokens / completion_tokens
  // Anthropic format: input_tokens / output_tokens
  const inputTokens =
    (usage.input_tokens as number) ?? (usage.prompt_tokens as number) ?? 0;
  const outputTokens =
    (usage.output_tokens as number) ?? (usage.completion_tokens as number) ?? 0;

  // OpenAI: completion_tokens_details.reasoning_tokens
  const completionDetails = usage.completion_tokens_details as
    | Record<string, unknown>
    | undefined;
  const reasoningTokens = (completionDetails?.reasoning_tokens as number) ?? 0;

  // OpenAI: prompt_tokens_details.cached_tokens
  const promptDetails = usage.prompt_tokens_details as
    | Record<string, unknown>
    | undefined;
  const openaiCachedTokens = (promptDetails?.cached_tokens as number) ?? 0;

  // Anthropic: cache_read_input_tokens / cache_creation_input_tokens
  const anthropicCacheRead = (usage.cache_read_input_tokens as number) ?? 0;
  const anthropicCacheWrite =
    (usage.cache_creation_input_tokens as number) ?? 0;

  const cacheReadTokens = openaiCachedTokens ?? anthropicCacheRead;
  const cacheWriteTokens = anthropicCacheWrite;
  const cachedTokens = cacheReadTokens + cacheWriteTokens;

  return {
    cachedTokens,
    cacheReadTokens,
    cacheWriteTokens,
    inputTokens,
    outputTokens,
    reasoningTokens
  };
};

export const extractModel = (
  body: Record<string, unknown>,
  fallback: string
): string => {
  return (body.model as string) ?? fallback;
};

/**
 * Accumulates token usage from SSE stream chunks.
 *
 * OpenAI sends usage in the last data chunk before [DONE].
 * Anthropic sends usage in the message_delta event before message_stop.
 */
export class StreamTokenAccumulator {
  private usage: TokenUsage = {
    cachedTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0
  };
  private model = "unknown";

  getUsage(): TokenUsage {
    return { ...this.usage };
  }

  getModel(): string {
    return this.model;
  }

  processChunk(line: string): void {
    if (!line.startsWith("data: ")) return;

    const data = line.slice(6).trim();
    if (data === "[DONE]") return;

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(data);
    } catch {
      return;
    }

    // Extract model if present
    if (typeof parsed.model === "string") {
      this.model = parsed.model;
    }

    // OpenAI: usage field in last chunk (when stream_options.include_usage is true)
    const usage = parsed.usage as Record<string, unknown> | undefined;
    if (usage) {
      if (typeof usage.prompt_tokens === "number") {
        this.usage.inputTokens = usage.prompt_tokens;
      }
      if (typeof usage.completion_tokens === "number") {
        this.usage.outputTokens = usage.completion_tokens;
      }
      const completionDetails = usage.completion_tokens_details as
        | Record<string, unknown>
        | undefined;
      if (
        completionDetails &&
        typeof completionDetails.reasoning_tokens === "number"
      ) {
        this.usage.reasoningTokens = completionDetails.reasoning_tokens;
      }
      const promptDetails = usage.prompt_tokens_details as
        | Record<string, unknown>
        | undefined;
      if (promptDetails && typeof promptDetails.cached_tokens === "number") {
        this.usage.cacheReadTokens = promptDetails.cached_tokens;
        this.usage.cachedTokens =
          this.usage.cacheReadTokens + this.usage.cacheWriteTokens;
      }
    }

    // Anthropic: message_delta event contains usage
    if (parsed.type === "message_delta") {
      const deltaUsage = (parsed as Record<string, unknown>).usage as
        | Record<string, unknown>
        | undefined;
      if (deltaUsage) {
        if (typeof deltaUsage.output_tokens === "number") {
          this.usage.outputTokens = deltaUsage.output_tokens;
        }
        if (typeof deltaUsage.cache_read_input_tokens === "number") {
          this.usage.cacheReadTokens = deltaUsage.cache_read_input_tokens;
          this.usage.cachedTokens =
            this.usage.cacheReadTokens + this.usage.cacheWriteTokens;
        }
      }
    }

    // Anthropic: message_start event contains input token count
    if (parsed.type === "message_start") {
      const message = (parsed as Record<string, unknown>).message as
        | Record<string, unknown>
        | undefined;
      if (message) {
        const msgUsage = message.usage as Record<string, unknown> | undefined;
        if (msgUsage) {
          if (typeof msgUsage.input_tokens === "number") {
            this.usage.inputTokens = msgUsage.input_tokens;
          }
          if (typeof msgUsage.cache_read_input_tokens === "number") {
            this.usage.cacheReadTokens = msgUsage.cache_read_input_tokens;
          }
          if (typeof msgUsage.cache_creation_input_tokens === "number") {
            this.usage.cacheWriteTokens = msgUsage.cache_creation_input_tokens;
          }
          this.usage.cachedTokens =
            this.usage.cacheReadTokens + this.usage.cacheWriteTokens;
        }
        if (typeof message.model === "string") {
          this.model = message.model;
        }
      }
    }
  }
}
