export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export const extractTokenUsage = (
  body: Record<string, unknown>
): TokenUsage => {
  const usage = body.usage as Record<string, unknown> | undefined;
  if (!usage) return { inputTokens: 0, outputTokens: 0 };

  // OpenAI format: prompt_tokens / completion_tokens
  // Anthropic format: input_tokens / output_tokens
  const inputTokens =
    (usage.input_tokens as number) ?? (usage.prompt_tokens as number) ?? 0;
  const outputTokens =
    (usage.output_tokens as number) ?? (usage.completion_tokens as number) ?? 0;

  return { inputTokens, outputTokens };
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
  private usage: TokenUsage = { inputTokens: 0, outputTokens: 0 };
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
    }

    // Anthropic: message_delta event contains usage
    if (parsed.type === "message_delta") {
      const deltaUsage = (parsed as Record<string, unknown>).usage as
        | Record<string, unknown>
        | undefined;
      if (deltaUsage && typeof deltaUsage.output_tokens === "number") {
        this.usage.outputTokens = deltaUsage.output_tokens;
      }
    }

    // Anthropic: message_start event contains input token count
    if (parsed.type === "message_start") {
      const message = (parsed as Record<string, unknown>).message as
        | Record<string, unknown>
        | undefined;
      if (message) {
        const msgUsage = message.usage as Record<string, unknown> | undefined;
        if (msgUsage && typeof msgUsage.input_tokens === "number") {
          this.usage.inputTokens = msgUsage.input_tokens;
        }
        if (typeof message.model === "string") {
          this.model = message.model;
        }
      }
    }
  }
}
