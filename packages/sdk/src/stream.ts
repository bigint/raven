import type { TextStreamChunk, ToolCall, Usage } from "./types";

const parseSSEChunk = (
  parsed: Record<string, unknown>
): TextStreamChunk | null => {
  const choices = parsed.choices as
    | Array<{
        delta?: { content?: string; tool_calls?: ToolCall[] };
        finish_reason?: string | null;
      }>
    | undefined;

  const choice = choices?.[0];

  if (choice?.delta?.content) {
    return { textDelta: choice.delta.content, type: "text-delta" };
  }

  if (choice?.delta?.tool_calls) {
    for (const tc of choice.delta.tool_calls) {
      return { toolCall: tc, type: "tool-call" };
    }
  }

  if (choice?.finish_reason) {
    const usage = parsed.usage as Record<string, number> | undefined;
    return {
      finishReason: choice.finish_reason,
      type: "finish",
      usage: usage
        ? {
            completionTokens: usage.completion_tokens ?? 0,
            promptTokens: usage.prompt_tokens ?? 0,
            totalTokens: usage.total_tokens ?? 0
          }
        : undefined
    };
  }

  if (parsed.usage && (!choices || choices.length === 0)) {
    const usage = parsed.usage as Record<string, number>;
    return {
      type: "finish",
      usage: {
        completionTokens: usage.completion_tokens ?? 0,
        promptTokens: usage.prompt_tokens ?? 0,
        totalTokens: usage.total_tokens ?? 0
      }
    };
  }

  return null;
};

export class TextStreamResult implements AsyncIterable<string> {
  private abortController: AbortController | null;
  private buffer = "";
  private consumed = false;
  private decoder = new TextDecoder();
  private finishReasonResolve!: (v: string) => void;
  private reader: ReadableStreamDefaultReader<Uint8Array>;
  private textAccumulator = "";
  private textResolve!: (v: string) => void;
  private toolCallsAccumulator: ToolCall[] = [];
  private toolCallsResolve!: (v: ToolCall[]) => void;
  private usageAccumulator: Usage = {
    completionTokens: 0,
    promptTokens: 0,
    totalTokens: 0
  };
  private usageResolve!: (v: Usage) => void;

  readonly finishReason: Promise<string>;
  readonly text: Promise<string>;
  readonly toolCalls: Promise<ToolCall[]>;
  readonly usage: Promise<Usage>;

  constructor(response: Response, abortController?: AbortController) {
    const body = response.body;
    if (!body) throw new Error("No response body");
    this.reader = body.getReader();
    this.abortController = abortController ?? null;

    this.text = new Promise((resolve) => {
      this.textResolve = resolve;
    });
    this.usage = new Promise((resolve) => {
      this.usageResolve = resolve;
    });
    this.finishReason = new Promise((resolve) => {
      this.finishReasonResolve = resolve;
    });
    this.toolCalls = new Promise((resolve) => {
      this.toolCallsResolve = resolve;
    });
  }

  abort(): void {
    this.abortController?.abort();
  }

  async *fullStream(): AsyncIterable<TextStreamChunk> {
    if (this.consumed) throw new Error("Stream already consumed");
    this.consumed = true;

    try {
      yield* this.readChunks();
    } finally {
      this.resolve();
    }
  }

  async *[Symbol.asyncIterator](): AsyncIterator<string> {
    if (this.consumed) throw new Error("Stream already consumed");
    this.consumed = true;

    try {
      for await (const chunk of this.readChunks()) {
        if (chunk.type === "text-delta" && chunk.textDelta) {
          yield chunk.textDelta;
        }
      }
    } finally {
      this.resolve();
    }
  }

  private async *readChunks(): AsyncIterable<TextStreamChunk> {
    while (true) {
      const { done, value } = await this.reader.read();
      if (done) break;

      this.buffer += this.decoder.decode(value, { stream: true });
      const lines = this.buffer.split("\n");
      this.buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") return;

        try {
          const parsed = JSON.parse(data) as Record<string, unknown>;
          const chunk = parseSSEChunk(parsed);
          if (!chunk) continue;

          if (chunk.type === "text-delta" && chunk.textDelta) {
            this.textAccumulator += chunk.textDelta;
          }
          if (chunk.type === "tool-call" && chunk.toolCall) {
            this.toolCallsAccumulator.push(chunk.toolCall);
          }
          if (chunk.usage) {
            this.usageAccumulator = {
              completionTokens:
                this.usageAccumulator.completionTokens +
                chunk.usage.completionTokens,
              promptTokens:
                this.usageAccumulator.promptTokens + chunk.usage.promptTokens,
              totalTokens:
                this.usageAccumulator.totalTokens + chunk.usage.totalTokens
            };
          }

          yield chunk;
        } catch {
          // skip malformed chunks
        }
      }
    }
  }

  private resolve(): void {
    this.reader.releaseLock();
    this.textResolve(this.textAccumulator);
    this.usageResolve(this.usageAccumulator);
    this.finishReasonResolve("stop");
    this.toolCallsResolve(this.toolCallsAccumulator);
  }
}
