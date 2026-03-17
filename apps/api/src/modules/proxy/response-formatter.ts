import type {
  LanguageModelUsage,
  ReasoningOutput,
  TextStreamPart,
  ToolSet
} from "ai";
import type { TokenUsage } from "./usage-mapper";
import { mapUsage } from "./usage-mapper";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mapFinishReason = (reason: string | undefined | null): string => {
  switch (reason) {
    case "stop":
      return "stop";
    case "length":
      return "length";
    case "tool-calls":
      return "tool_calls";
    case "content-filter":
      return "content_filter";
    default:
      return "stop";
  }
};

const buildOpenAIUsage = (usage: TokenUsage): Record<string, unknown> => ({
  completion_tokens: usage.outputTokens,
  prompt_tokens: usage.inputTokens,
  total_tokens: usage.inputTokens + usage.outputTokens,
  ...(usage.reasoningTokens > 0
    ? {
        completion_tokens_details: {
          reasoning_tokens: usage.reasoningTokens
        }
      }
    : {}),
  ...(usage.cacheReadTokens > 0
    ? {
        prompt_tokens_details: {
          cached_tokens: usage.cacheReadTokens
        }
      }
    : {})
});

// ---------------------------------------------------------------------------
// Buffered response
// ---------------------------------------------------------------------------

interface BufferedResult {
  text: string;
  finishReason: string | undefined | null;
  usage: LanguageModelUsage;
  toolCalls?: ReadonlyArray<{
    toolCallId: string;
    toolName: string;
    input: unknown;
  }>;
  reasoning?: ReasoningOutput[];
}

export const formatBufferedResponse = (
  result: BufferedResult,
  requestedModel: string
): { body: Record<string, unknown>; text: string; usage: TokenUsage } => {
  const tokenUsage = mapUsage(result.usage);

  const message: Record<string, unknown> = {
    content: result.text || null,
    role: "assistant"
  };

  if (result.toolCalls?.length) {
    message.tool_calls = result.toolCalls.map((tc) => ({
      function: {
        arguments: JSON.stringify(tc.input),
        name: tc.toolName
      },
      id: tc.toolCallId,
      type: "function"
    }));
    // When tool calls are present with no text, content should be null
    if (!result.text) message.content = null;
  }

  if (result.reasoning?.length) {
    // Serialize ReasoningOutput[] to a single string for OpenAI-compatible format
    message.reasoning_content = result.reasoning
      .map((r) => r.text)
      .filter(Boolean)
      .join("");
  }

  const body: Record<string, unknown> = {
    choices: [
      {
        finish_reason: mapFinishReason(result.finishReason),
        index: 0,
        message
      }
    ],
    created: Math.floor(Date.now() / 1000),
    id: `chatcmpl-${crypto.randomUUID()}`,
    model: requestedModel,
    object: "chat.completion",
    usage: buildOpenAIUsage(tokenUsage)
  };

  return {
    body,
    text: JSON.stringify(body),
    usage: tokenUsage
  };
};

// ---------------------------------------------------------------------------
// Streaming response
// ---------------------------------------------------------------------------

/**
 * Converts AI SDK's fullStream into an OpenAI-compatible SSE ReadableStream.
 *
 * The onFinish callback fires once usage data is available (at stream end),
 * enabling deferred logging without blocking the response.
 */
export const formatStreamingResponse = (
  fullStream: AsyncIterable<TextStreamPart<ToolSet>>,
  requestedModel: string,
  includeUsage: boolean,
  onFinish: (usage: TokenUsage) => void
): ReadableStream<Uint8Array> => {
  const encoder = new TextEncoder();
  const completionId = `chatcmpl-${crypto.randomUUID()}`;
  const created = Math.floor(Date.now() / 1000);

  let finished = false;

  const sse = (data: Record<string, unknown>): Uint8Array =>
    encoder.encode(`data: ${JSON.stringify(data)}\n\n`);

  const baseChunk = {
    created,
    id: completionId,
    model: requestedModel,
    object: "chat.completion.chunk"
  };

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // Track streaming tool call indices for correct OpenAI delta format
        let toolCallIndex = -1;

        for await (const part of fullStream) {
          switch (part.type) {
            case "text-delta": {
              controller.enqueue(
                sse({
                  ...baseChunk,
                  choices: [{ delta: { content: part.text }, index: 0 }]
                })
              );
              break;
            }

            case "reasoning-delta": {
              controller.enqueue(
                sse({
                  ...baseChunk,
                  choices: [
                    {
                      delta: { reasoning_content: part.text },
                      index: 0
                    }
                  ]
                })
              );
              break;
            }

            case "tool-input-start": {
              toolCallIndex++;
              controller.enqueue(
                sse({
                  ...baseChunk,
                  choices: [
                    {
                      delta: {
                        tool_calls: [
                          {
                            function: { arguments: "", name: part.toolName },
                            id: part.id,
                            index: toolCallIndex,
                            type: "function"
                          }
                        ]
                      },
                      index: 0
                    }
                  ]
                })
              );
              break;
            }

            case "tool-input-delta": {
              controller.enqueue(
                sse({
                  ...baseChunk,
                  choices: [
                    {
                      delta: {
                        tool_calls: [
                          {
                            function: { arguments: part.delta },
                            index: toolCallIndex
                          }
                        ]
                      },
                      index: 0
                    }
                  ]
                })
              );
              break;
            }

            case "finish": {
              const finishChunk: Record<string, unknown> = {
                ...baseChunk,
                choices: [
                  {
                    delta: {},
                    finish_reason: mapFinishReason(part.finishReason),
                    index: 0
                  }
                ]
              };

              if (includeUsage && part.totalUsage) {
                const usage = mapUsage(part.totalUsage);
                finishChunk.usage = buildOpenAIUsage(usage);
              }

              controller.enqueue(sse(finishChunk));

              if (part.totalUsage) {
                finished = true;
                onFinish(mapUsage(part.totalUsage));
              }
              break;
            }

            case "error": {
              controller.enqueue(
                sse({
                  error: {
                    code: "upstream_error",
                    message:
                      part.error instanceof Error
                        ? part.error.message
                        : "Unknown upstream error"
                  }
                })
              );
              break;
            }

            default:
              break;
          }
        }
      } catch (err) {
        // Stream iteration threw — emit error SSE
        controller.enqueue(
          sse({
            error: {
              code: "stream_error",
              message:
                err instanceof Error ? err.message : "Stream processing error"
            }
          })
        );
      } finally {
        // Always emit [DONE] and close
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();

        // Ensure onFinish fires even if we never got a finish event
        if (!finished) {
          onFinish({
            cachedTokens: 0,
            cacheReadTokens: 0,
            cacheWriteTokens: 0,
            inputTokens: 0,
            outputTokens: 0,
            reasoningTokens: 0
          });
        }
      }
    }
  });
};

// ---------------------------------------------------------------------------
// Error response
// ---------------------------------------------------------------------------

/**
 * Format an AI SDK error into an OpenAI-compatible error response.
 * Preserves the raw provider error body when available so clients that
 * parse provider-specific error formats continue to work.
 */
export const formatErrorResponse = (
  err: unknown
): { body: string; status: number } => {
  const error = err as Record<string, unknown>;

  const statusCode =
    (error.statusCode as number) ?? (error.status as number) ?? 500;

  // Pass through the raw provider error body if available
  if (error.responseBody && typeof error.responseBody === "string") {
    return { body: error.responseBody, status: statusCode };
  }

  const message =
    (error.message as string) ??
    (err instanceof Error ? err.message : "Internal error");

  return {
    body: JSON.stringify({
      error: {
        code: statusCode >= 500 ? "internal_error" : "upstream_error",
        message
      }
    }),
    status: statusCode
  };
};
