import { getModelPricing } from "@/lib/pricing-cache";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnthropicContentBlock {
  readonly cache_control?: { readonly type: string };
  readonly id?: string;
  readonly input?: unknown;
  readonly name?: string;
  readonly text?: string;
  readonly thinking?: string;
  readonly type: string;
}

interface AnthropicMessage {
  content: unknown;
  role: string;
}

interface AnthropicUsage {
  readonly cache_creation_input_tokens?: number;
  readonly cache_read_input_tokens?: number;
  readonly input_tokens?: number;
  readonly output_tokens?: number;
}

interface OpenAIToolCall {
  readonly function: { readonly arguments: string; readonly name: string };
  readonly id: string;
}

interface OpenAITool {
  readonly function?: {
    readonly description?: string;
    readonly name: string;
    readonly parameters: unknown;
  };
  readonly type?: string;
}

interface StreamToolCall {
  arguments: string;
  id: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const toTextBlocks = (
  content: unknown
): ReadonlyArray<Record<string, unknown>> => {
  if (typeof content === "string") {
    return [{ text: content, type: "text" }];
  }
  if (Array.isArray(content)) {
    return content as ReadonlyArray<Record<string, unknown>>;
  }
  if (content !== null && content !== undefined) {
    return [content as Record<string, unknown>];
  }
  return [];
};

const mapFinishReason = (stopReason: string | undefined): string => {
  switch (stopReason) {
    case "end_turn":
    case "stop_sequence":
      return "stop";
    case "max_tokens":
      return "length";
    case "tool_use":
      return "tool_calls";
    default:
      return "stop";
  }
};

// ---------------------------------------------------------------------------
// Image conversion — OpenAI image_url -> Anthropic image
// ---------------------------------------------------------------------------

/**
 * Convert OpenAI image_url content block to Anthropic image block.
 * data:image/png;base64,xxx -> {type:"image", source:{type:"base64", media_type:"image/png", data:"xxx"}}
 * https://example.com/img.png -> {type:"image", source:{type:"url", url:"https://..."}}
 */
const convertImageBlock = (
  block: Record<string, unknown>
): Record<string, unknown> => {
  const imageUrl = block.image_url as Record<string, unknown> | undefined;
  if (!imageUrl) return block;

  const url = imageUrl.url as string;
  if (!url) return block;

  // data URI: extract media type and base64 data
  const dataMatch = url.match(/^data:([^;]+);base64,(.+)$/s);
  if (dataMatch) {
    return {
      source: {
        data: dataMatch[2],
        media_type: dataMatch[1],
        type: "base64"
      },
      type: "image"
    };
  }

  // HTTP URL: use url source type
  return {
    source: { type: "url", url },
    type: "image"
  };
};

/**
 * Convert all image_url blocks in a content array to Anthropic image format.
 * Non-image blocks are passed through unchanged.
 */
const convertContentImages = (content: unknown): unknown => {
  if (!Array.isArray(content)) return content;

  return (content as Array<Record<string, unknown>>).map((block) => {
    if (block.type === "image_url") return convertImageBlock(block);
    return block;
  });
};

// ---------------------------------------------------------------------------
// normalizeRequest — OpenAI -> Anthropic
// ---------------------------------------------------------------------------

export const normalizeRequest = (
  body: Record<string, unknown>
): Record<string, unknown> => {
  const messages = body.messages as Array<Record<string, unknown>> | undefined;
  if (!messages) return body;

  // 1. Extract system messages
  const systemBlocks: Array<Record<string, unknown>> = [];
  const cleaned: AnthropicMessage[] = [];

  for (const msg of messages) {
    const role = msg.role as string;

    if (role === "system") {
      const content = msg.content;
      if (typeof content === "string") {
        const block: Record<string, unknown> = { text: content, type: "text" };
        if (msg.cache_control) block.cache_control = msg.cache_control;
        systemBlocks.push(block);
      } else if (Array.isArray(content)) {
        for (const b of content as Array<Record<string, unknown>>) {
          systemBlocks.push({ ...b });
        }
      } else {
        systemBlocks.push({ text: String(content), type: "text" });
      }
      continue;
    }

    // tool role -> user with tool_result
    if (role === "tool") {
      const toolCallId = (msg.tool_call_id as string) ?? "unknown";
      const content = msg.content;
      const resultText =
        typeof content === "string" ? content : JSON.stringify(content);
      cleaned.push({
        content: [
          {
            content: resultText,
            tool_use_id: toolCallId,
            type: "tool_result"
          }
        ],
        role: "user"
      });
      continue;
    }

    // assistant with tool_calls -> tool_use blocks
    if (role === "assistant" && msg.tool_calls) {
      const toolCalls = msg.tool_calls as ReadonlyArray<OpenAIToolCall>;
      const contentBlocks: Array<Record<string, unknown>> = [];

      const textContent = msg.content;
      if (
        textContent &&
        typeof textContent === "string" &&
        textContent.trim()
      ) {
        contentBlocks.push({ text: textContent, type: "text" });
      }

      for (const tc of toolCalls) {
        let input: unknown = {};
        try {
          input = JSON.parse(tc.function.arguments);
        } catch {
          input = { raw: tc.function.arguments };
        }
        contentBlocks.push({
          id: tc.id,
          input,
          name: tc.function.name,
          type: "tool_use"
        });
      }

      cleaned.push({ content: contentBlocks, role: "assistant" });
      continue;
    }

    // Regular user/assistant — strip cache_control from message level
    // (Anthropic only allows cache_control on content blocks, not messages)
    // Convert OpenAI image_url blocks to Anthropic image format
    cleaned.push({ content: convertContentImages(msg.content ?? ""), role });
  }

  // 2. Merge consecutive same-role messages (Anthropic requires strict alternation)
  const merged: AnthropicMessage[] = [];
  for (const msg of cleaned) {
    const prev = merged[merged.length - 1];
    if (prev && prev.role === msg.role) {
      const prevBlocks = toTextBlocks(prev.content);
      const curBlocks = toTextBlocks(msg.content);
      prev.content = [...prevBlocks, ...curBlocks];
    } else {
      merged.push({ ...msg });
    }
  }

  // 3. Ensure first message is user
  if (merged.length > 0 && merged[0]?.role !== "user") {
    merged.unshift({ content: ".", role: "user" });
  }

  // 4. Strip trailing whitespace from last assistant message (prefill support)
  const lastMsg = merged[merged.length - 1];
  if (lastMsg?.role === "assistant" && typeof lastMsg.content === "string") {
    lastMsg.content = lastMsg.content.trimEnd();
  }

  // 5. Handle empty message arrays
  if (merged.length === 0) {
    merged.push({ content: "Hello", role: "user" });
  }

  // 6. Build result
  const result: Record<string, unknown> = {
    max_tokens: body.max_tokens ?? 4096,
    messages: merged,
    model: body.model,
    stream: body.stream
  };

  // System
  if (systemBlocks.length > 0) {
    result.system = systemBlocks;
  }

  // Parameters
  if (body.temperature !== undefined) result.temperature = body.temperature;
  if (body.top_p !== undefined) result.top_p = body.top_p;
  if (body.stop) result.stop_sequences = body.stop;
  if (body.thinking) result.thinking = body.thinking;

  // Convert OpenAI tools format to Anthropic
  if (Array.isArray(body.tools) && body.tools.length > 0) {
    result.tools = (body.tools as ReadonlyArray<OpenAITool>).map((t) => ({
      description: t.function?.description,
      input_schema: t.function?.parameters,
      name: t.function?.name
    }));
  }

  // Convert tool_choice
  if (body.tool_choice !== undefined) {
    const tc = body.tool_choice;
    if (tc === "auto") {
      result.tool_choice = { type: "auto" };
    } else if (tc === "required" || tc === "any") {
      result.tool_choice = { type: "any" };
    } else if (tc === "none") {
      result.tool_choice = { type: "none" };
    } else if (
      typeof tc === "object" &&
      tc !== null &&
      (tc as Record<string, unknown>).function
    ) {
      const fn = (tc as Record<string, unknown>).function as Record<
        string,
        unknown
      >;
      result.tool_choice = { name: fn.name, type: "tool" };
    }
  }

  return result;
};

// ---------------------------------------------------------------------------
// normalizeResponse — Anthropic buffered -> OpenAI format
// ---------------------------------------------------------------------------

export const normalizeResponse = (
  body: Record<string, unknown>
): Record<string, unknown> => {
  const id = (body.id as string) ?? "msg_unknown";
  const model = (body.model as string) ?? "unknown";
  const stopReason = (body.stop_reason as string) ?? "end_turn";
  const contentBlocks =
    (body.content as ReadonlyArray<AnthropicContentBlock>) ?? [];
  const usage = (body.usage as AnthropicUsage) ?? {};

  // Extract text, tool_use, and thinking blocks
  let textContent = "";
  const toolCalls: Array<Record<string, unknown>> = [];
  const thinkingBlocks: Array<Record<string, unknown>> = [];

  for (const block of contentBlocks) {
    if (block.type === "text" && block.text) {
      textContent += block.text;
    } else if (block.type === "tool_use") {
      toolCalls.push({
        function: {
          arguments: JSON.stringify(block.input ?? {}),
          name: block.name ?? ""
        },
        id: block.id ?? "",
        type: "function"
      });
    } else if (block.type === "thinking" && block.thinking) {
      thinkingBlocks.push({
        thinking: block.thinking,
        type: "thinking"
      });
    }
  }

  // Build message
  const message: Record<string, unknown> = {
    content: textContent || null,
    role: "assistant"
  };

  if (toolCalls.length > 0) {
    message.tool_calls = toolCalls;
  }

  if (thinkingBlocks.length > 0) {
    message.thinking_blocks = thinkingBlocks;
  }

  // Usage
  const inputTokens = usage.input_tokens ?? 0;
  const outputTokens = usage.output_tokens ?? 0;
  const cacheCreationTokens = usage.cache_creation_input_tokens ?? 0;
  const cacheReadTokens = usage.cache_read_input_tokens ?? 0;

  return {
    choices: [
      {
        finish_reason: mapFinishReason(stopReason),
        index: 0,
        message
      }
    ],
    created: Math.floor(Date.now() / 1000),
    id: `chatcmpl-${id}`,
    model,
    object: "chat.completion",
    usage: {
      cache_creation_input_tokens: cacheCreationTokens,
      cache_read_input_tokens: cacheReadTokens,
      completion_tokens: outputTokens,
      prompt_tokens: inputTokens,
      prompt_tokens_details: {
        cached_tokens: cacheReadTokens
      },
      total_tokens: inputTokens + outputTokens
    }
  };
};

// ---------------------------------------------------------------------------
// createStreamNormalizer — returns per-stream closure with isolated state
// ---------------------------------------------------------------------------

export const createStreamNormalizer = (): ((line: string) => string | null) => {
  let streamToolCalls: StreamToolCall[] = [];

  return (line: string): string | null => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) return null;
    const data = trimmed.slice(5).trim();
    if (data === "[DONE]") return line;

    try {
      const parsed = JSON.parse(data) as Record<string, unknown>;

      // Message start — reset state and emit initial chunk
      if (parsed.type === "message_start") {
        streamToolCalls = [];
        const message = parsed.message as Record<string, unknown> | undefined;
        const usage = message?.usage as Record<string, number> | undefined;
        if (usage) {
          return `data: ${JSON.stringify({
            choices: [{ delta: { content: "", role: "assistant" }, index: 0 }],
            usage: {
              completion_tokens: 0,
              prompt_tokens: usage.input_tokens ?? 0,
              total_tokens: usage.input_tokens ?? 0
            }
          })}`;
        }
        return null;
      }

      // Content block start — track tool call
      if (parsed.type === "content_block_start") {
        const block = parsed.content_block as
          | Record<string, unknown>
          | undefined;
        if (block?.type === "tool_use") {
          const idx = (parsed.index as number) ?? streamToolCalls.length;
          streamToolCalls[idx] = {
            arguments: "",
            id: block.id as string,
            name: block.name as string
          };
        }
        return null;
      }

      // Content block delta — text or tool input
      if (parsed.type === "content_block_delta") {
        const delta = parsed.delta as Record<string, unknown> | undefined;
        if (delta?.type === "text_delta" && delta.text) {
          return `data: ${JSON.stringify({
            choices: [{ delta: { content: delta.text }, index: 0 }]
          })}`;
        }
        if (
          delta?.type === "input_json_delta" &&
          delta.partial_json !== undefined
        ) {
          const idx = (parsed.index as number) ?? 0;
          const tc = streamToolCalls[idx];
          if (tc) {
            tc.arguments += delta.partial_json as string;
          }
          return null;
        }
        return null;
      }

      // Content block stop — emit accumulated tool call
      if (parsed.type === "content_block_stop") {
        const idx = (parsed.index as number) ?? 0;
        const tc = streamToolCalls[idx];
        if (tc) {
          return `data: ${JSON.stringify({
            choices: [
              {
                delta: {
                  tool_calls: [
                    {
                      function: {
                        arguments: tc.arguments,
                        name: tc.name
                      },
                      id: tc.id,
                      index: idx,
                      type: "function"
                    }
                  ]
                },
                index: 0
              }
            ]
          })}`;
        }
        return null;
      }

      // Message delta — finish reason + usage
      if (parsed.type === "message_delta") {
        const delta = parsed.delta as { stop_reason?: string } | undefined;
        const usage = parsed.usage as Record<string, number> | undefined;
        const stopReason = delta?.stop_reason;
        const finishReason = mapFinishReason(stopReason);
        return `data: ${JSON.stringify({
          choices: [{ delta: {}, finish_reason: finishReason, index: 0 }],
          usage: usage
            ? {
                completion_tokens: usage.output_tokens ?? 0,
                prompt_tokens: 0,
                total_tokens: usage.output_tokens ?? 0
              }
            : undefined
        })}`;
      }

      // Message stop
      if (parsed.type === "message_stop") {
        streamToolCalls = [];
        return "data: [DONE]";
      }
    } catch {
      return null;
    }

    return null;
  };
};

// ---------------------------------------------------------------------------
// transformBody — cache control injection
// ---------------------------------------------------------------------------

export const transformBody = (
  body: Record<string, unknown>
): Record<string, unknown> => {
  const result = { ...body };

  // Add cache_control to system blocks
  if (result.system !== undefined) {
    const blocks =
      typeof result.system === "string"
        ? [{ text: result.system, type: "text" }]
        : (result.system as Array<Record<string, unknown>>).map((b) => ({
            ...b
          }));

    const hasExisting = blocks.some((b) => b.cache_control !== undefined);
    if (!hasExisting && blocks.length > 0) {
      const last = blocks[blocks.length - 1];
      if (last) last.cache_control = { type: "ephemeral" };
    }
    result.system = blocks;
  }

  // Add cache_control to last tool
  if (Array.isArray(result.tools) && result.tools.length > 0) {
    const tools = (result.tools as Array<Record<string, unknown>>).map((t) => ({
      ...t
    }));

    const hasExisting = tools.some((t) => t.cache_control !== undefined);
    if (!hasExisting) {
      const last = tools[tools.length - 1];
      if (last) last.cache_control = { type: "ephemeral" };
    }
    result.tools = tools;
  }

  return result;
};

// ---------------------------------------------------------------------------
// estimateCost — Anthropic cache pricing
// ---------------------------------------------------------------------------

export const estimateCost = (
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens = 0,
  cacheWriteTokens = 0
): number => {
  const pricing = getModelPricing(model, provider);
  const regularInput = Math.max(
    0,
    inputTokens - cacheReadTokens - cacheWriteTokens
  );
  const regularInputCost = (regularInput / 1_000_000) * pricing.input;
  const cacheWriteCost = (cacheWriteTokens / 1_000_000) * pricing.input * 1.25;
  const cacheReadCost = (cacheReadTokens / 1_000_000) * pricing.input * 0.1;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return regularInputCost + cacheWriteCost + cacheReadCost + outputCost;
};

// ---------------------------------------------------------------------------
// mapEndpoint — OpenAI paths -> Anthropic paths
// ---------------------------------------------------------------------------

export const mapEndpoint = (endpoint: string): string => {
  if (endpoint === "/chat/completions") return "/messages";
  return endpoint;
};
