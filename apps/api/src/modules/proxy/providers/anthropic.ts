import { getModelPricing } from "@/lib/pricing-cache";
import { PROVIDERS } from "@/lib/providers";
import type { ProviderAdapter } from "./registry";

/* ------------------------------------------------------------------ */
/*  OpenAI ↔ Anthropic message format conversion                      */
/* ------------------------------------------------------------------ */

interface AnthropicMessage {
  role: "user" | "assistant";
  content: unknown;
}

/**
 * Convert an OpenAI-format message array into Anthropic-format.
 *
 * Handles:
 * - system → extracted to separate field
 * - assistant with tool_calls → assistant with tool_use content blocks
 * - tool (tool results) → user with tool_result content blocks
 * - Consecutive same-role merging (Anthropic requires strict alternation)
 * - Trailing assistant stripping (some models don't support prefill)
 * - Extra field stripping (cache_control, name, etc.)
 */
const convertMessages = (
  rawMessages: Array<Record<string, unknown>>
): { messages: AnthropicMessage[]; systemText: string | undefined } => {
  const systemParts: string[] = [];
  const converted: AnthropicMessage[] = [];

  for (const msg of rawMessages) {
    const role = msg.role as string;

    // System → extract
    if (role === "system") {
      const content = msg.content;
      systemParts.push(typeof content === "string" ? content : String(content));
      continue;
    }

    // Assistant with tool_calls → convert to Anthropic tool_use format
    if (role === "assistant") {
      const toolCalls = msg.tool_calls as
        | Array<{
            id: string;
            function: { name: string; arguments: string };
          }>
        | undefined;

      if (toolCalls && toolCalls.length > 0) {
        // Build content blocks: text (if any) + tool_use blocks
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

        converted.push({ content: contentBlocks, role: "assistant" });
        continue;
      }

      // Regular assistant message
      converted.push({
        content: msg.content ?? "",
        role: "assistant"
      });
      continue;
    }

    // Tool result → convert to Anthropic user message with tool_result content
    if (role === "tool") {
      const toolCallId = msg.tool_call_id as string | undefined;
      const content = msg.content;
      const resultText =
        typeof content === "string" ? content : JSON.stringify(content);

      converted.push({
        content: [
          {
            content: resultText,
            tool_use_id: toolCallId ?? "unknown",
            type: "tool_result"
          }
        ],
        role: "user"
      });
      continue;
    }

    // Regular user message
    if (role === "user") {
      converted.push({
        content: msg.content ?? "",
        role: "user"
      });
      continue;
    }

    // Unknown role — treat as user
    converted.push({
      content: msg.content ?? "",
      role: "user"
    });
  }

  // Merge consecutive same-role messages
  const merged: AnthropicMessage[] = [];
  for (const msg of converted) {
    const prev = merged[merged.length - 1];
    if (prev && prev.role === msg.role) {
      // Merge into array content blocks
      const prevBlocks = Array.isArray(prev.content)
        ? prev.content
        : [{ text: String(prev.content), type: "text" }];
      const curBlocks = Array.isArray(msg.content)
        ? msg.content
        : [{ text: String(msg.content), type: "text" }];
      prev.content = [...prevBlocks, ...curBlocks];
    } else {
      merged.push({ ...msg });
    }
  }

  // Ensure first message is user
  if (merged.length > 0 && merged[0]?.role !== "user") {
    merged.unshift({ content: ".", role: "user" });
  }

  // Strip trailing empty assistant (prefill) — but keep non-empty ones
  // for tool-calling flows where the conversation legitimately ends with assistant
  const last = merged[merged.length - 1];
  if (last?.role === "assistant") {
    const content = last.content;
    const isEmpty =
      !content ||
      (typeof content === "string" && !content.trim()) ||
      (Array.isArray(content) && content.length === 0);
    if (isEmpty) {
      merged.pop();
    }
  }

  // Safety
  if (merged.length === 0) {
    merged.push({ content: "Hello", role: "user" });
  }

  const systemText =
    systemParts.length > 0 ? systemParts.join("\n\n") : undefined;

  return { messages: merged, systemText };
};

/* ------------------------------------------------------------------ */
/*  Anthropic → OpenAI streaming chunk conversion                     */
/* ------------------------------------------------------------------ */

// Track active tool calls during streaming
let streamToolCalls: Array<{
  id: string;
  name: string;
  arguments: string;
}> = [];

const convertStreamChunk = (line: string): string | null => {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return null;
  const data = trimmed.slice(5).trim();
  if (data === "[DONE]") return line;

  try {
    const parsed = JSON.parse(data) as Record<string, unknown>;

    // Text delta
    if (parsed.type === "content_block_delta") {
      const delta = parsed.delta as Record<string, unknown> | undefined;
      if (delta?.type === "text_delta" && delta.text) {
        return `data: ${JSON.stringify({
          choices: [{ delta: { content: delta.text }, index: 0 }]
        })}`;
      }
      // Tool input delta
      if (
        delta?.type === "input_json_delta" &&
        delta.partial_json !== undefined
      ) {
        const idx = (parsed.index as number) ?? 0;
        if (streamToolCalls[idx]) {
          streamToolCalls[idx].arguments += delta.partial_json as string;
        }
        return null; // Accumulate, emit on content_block_stop
      }
    }

    // Tool use block start
    if (parsed.type === "content_block_start") {
      const block = parsed.content_block as Record<string, unknown> | undefined;
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

    // Content block stop — emit accumulated tool call
    if (parsed.type === "content_block_stop") {
      const idx = (parsed.index as number) ?? 0;
      const tc = streamToolCalls[idx];
      if (tc) {
        const chunk = `data: ${JSON.stringify({
          choices: [
            {
              delta: {
                tool_calls: [
                  {
                    function: { arguments: tc.arguments, name: tc.name },
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
        return chunk;
      }
      return null;
    }

    // Message delta (stop reason + usage)
    if (parsed.type === "message_delta") {
      const delta = parsed.delta as { stop_reason?: string } | undefined;
      const usage = parsed.usage as Record<string, number> | undefined;
      const stopReason = delta?.stop_reason;
      // Map Anthropic stop reasons to OpenAI
      const finishReason =
        stopReason === "tool_use" ? "tool_calls" : (stopReason ?? "stop");
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

    // Message start
    if (parsed.type === "message_start") {
      streamToolCalls = []; // Reset for new message
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
    }

    // Message stop
    if (parsed.type === "message_stop") {
      streamToolCalls = []; // Clean up
      return "data: [DONE]";
    }
  } catch {
    return null;
  }

  return null;
};

/* ------------------------------------------------------------------ */
/*  Adapter                                                           */
/* ------------------------------------------------------------------ */

export const anthropicAdapter = (provider: string): ProviderAdapter => {
  const config = PROVIDERS[provider];
  if (!config) throw new Error(`Unknown provider: ${provider}`);

  return {
    baseUrl: config.baseUrl,
    chatEndpoint: config.chatEndpoint,

    estimateCost(
      model,
      inputTokens,
      outputTokens,
      cacheReadTokens = 0,
      cacheWriteTokens = 0
    ) {
      const pricing = getModelPricing(model, provider);
      const regularInput = Math.max(
        0,
        inputTokens - cacheReadTokens - cacheWriteTokens
      );
      const regularInputCost = (regularInput / 1_000_000) * pricing.input;
      const cacheWriteCost =
        (cacheWriteTokens / 1_000_000) * pricing.input * 1.25;
      const cacheReadCost = (cacheReadTokens / 1_000_000) * pricing.input * 0.1;
      const outputCost = (outputTokens / 1_000_000) * pricing.output;
      return regularInputCost + cacheWriteCost + cacheReadCost + outputCost;
    },
    modelsEndpoint: config.modelsEndpoint,
    name: provider,

    normalizeRequest(body) {
      const messages = body.messages as
        | Array<Record<string, unknown>>
        | undefined;
      if (!messages) return body;

      const { messages: normalized, systemText } = convertMessages(messages);

      const result: Record<string, unknown> = {
        max_tokens: body.max_tokens ?? 4096,
        messages: normalized,
        model: body.model,
        stream: body.stream
      };

      if (systemText) result.system = systemText;
      if (body.temperature !== undefined) result.temperature = body.temperature;
      if (body.top_p !== undefined) result.top_p = body.top_p;
      if (body.stop) result.stop_sequences = body.stop;
      if (body.thinking) result.thinking = body.thinking;

      // Convert OpenAI tool format to Anthropic tool format
      if (Array.isArray(body.tools) && body.tools.length > 0) {
        result.tools = (
          body.tools as Array<{
            function?: {
              description?: string;
              name: string;
              parameters: unknown;
            };
          }>
        ).map((t) => ({
          description: t.function?.description,
          input_schema: t.function?.parameters,
          name: t.function?.name
        }));
      }

      return result;
    },

    normalizeStreamChunk: convertStreamChunk,

    transformBody(body) {
      const result = { ...body };

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

      if (Array.isArray(result.tools) && result.tools.length > 0) {
        const tools = (result.tools as Array<Record<string, unknown>>).map(
          (t) => ({ ...t })
        );

        const hasExisting = tools.some((t) => t.cache_control !== undefined);
        if (!hasExisting) {
          const last = tools[tools.length - 1];
          if (last) last.cache_control = { type: "ephemeral" };
        }
        result.tools = tools;
      }

      return result;
    },

    transformHeaders(apiKey, headers) {
      return {
        ...headers,
        ...config.authHeaders(apiKey)
      };
    }
  };
};
