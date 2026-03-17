import { getModelPricing } from "@/lib/pricing-cache";
import { PROVIDERS } from "@/lib/providers";
import type { ProviderAdapter } from "./registry";

/**
 * Convert OpenAI-format request body to Anthropic-format.
 * Handles: system extraction, message cleaning, tool format conversion,
 * tool_choice conversion, and extra field stripping.
 */
const normalizeRequest = (
  body: Record<string, unknown>
): Record<string, unknown> => {
  const messages = body.messages as Array<Record<string, unknown>> | undefined;
  if (!messages) return body;

  // 1. Extract system messages into separate field
  const systemParts: string[] = [];
  const cleaned: Array<{ role: string; content: unknown }> = [];

  for (const msg of messages) {
    const role = msg.role as string;

    if (role === "system") {
      const content = msg.content;
      systemParts.push(typeof content === "string" ? content : String(content));
      continue;
    }

    // Convert OpenAI "tool" role to Anthropic "user" with tool_result
    if (role === "tool") {
      const toolCallId = msg.tool_call_id as string | undefined;
      const content = msg.content;
      const resultText =
        typeof content === "string" ? content : JSON.stringify(content);
      cleaned.push({
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

    // Convert assistant with OpenAI tool_calls to Anthropic tool_use
    if (role === "assistant" && msg.tool_calls) {
      const toolCalls = msg.tool_calls as Array<{
        id: string;
        function: { name: string; arguments: string };
      }>;
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

    // Regular user/assistant — keep content and cache_control, strip other extra fields
    const entry: Record<string, unknown> = { content: msg.content ?? "", role };
    if (msg.cache_control) entry.cache_control = msg.cache_control;
    cleaned.push(entry as { role: string; content: unknown });
  }

  // 2. Merge consecutive same-role messages (Anthropic requires strict alternation)
  const merged: Array<{ role: string; content: unknown }> = [];
  for (const msg of cleaned) {
    const prev = merged[merged.length - 1];
    if (prev && prev.role === msg.role) {
      const prevBlocks = Array.isArray(prev.content)
        ? prev.content
        : typeof prev.content === "string"
          ? [{ text: prev.content, type: "text" }]
          : [prev.content];
      const curBlocks = Array.isArray(msg.content)
        ? msg.content
        : typeof msg.content === "string"
          ? [{ text: msg.content, type: "text" }]
          : [msg.content];
      prev.content = [...prevBlocks, ...curBlocks];
    } else {
      merged.push({ ...msg });
    }
  }

  // 3. Ensure first message is user
  if (merged.length > 0 && merged[0]?.role !== "user") {
    merged.unshift({ content: ".", role: "user" });
  }

  // 4. If last message is assistant, strip trailing whitespace (prefill support)
  const lastMsg = merged[merged.length - 1];
  if (lastMsg?.role === "assistant" && typeof lastMsg.content === "string") {
    lastMsg.content = lastMsg.content.trimEnd();
  }

  if (merged.length === 0) {
    merged.push({ content: "Hello", role: "user" });
  }

  // 5. Build result
  const result: Record<string, unknown> = {
    max_tokens: body.max_tokens ?? 4096,
    messages: merged,
    model: body.model,
    stream: body.stream
  };

  // System
  const systemText =
    systemParts.length > 0 ? systemParts.join("\n\n") : undefined;
  if (systemText) result.system = systemText;

  // Parameters
  if (body.temperature !== undefined) result.temperature = body.temperature;
  if (body.top_p !== undefined) result.top_p = body.top_p;
  if (body.stop) result.stop_sequences = body.stop;
  if (body.thinking) result.thinking = body.thinking;

  // Convert OpenAI tools format to Anthropic
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

  // Don't pass OpenAI-specific fields
  // stream_options, n, logprobs, etc. are stripped by not copying them

  return result;
};

/**
 * Convert Anthropic streaming chunks to OpenAI format.
 */
// Track tool calls being accumulated during streaming
let streamToolCalls: Array<{
  id: string;
  name: string;
  arguments: string;
}> = [];

const normalizeStreamChunk = (line: string): string | null => {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return null;
  const data = trimmed.slice(5).trim();
  if (data === "[DONE]") return line;

  try {
    const parsed = JSON.parse(data) as Record<string, unknown>;

    // Text content
    if (parsed.type === "content_block_delta") {
      const delta = parsed.delta as Record<string, unknown> | undefined;
      if (delta?.type === "text_delta" && delta.text) {
        return `data: ${JSON.stringify({
          choices: [{ delta: { content: delta.text }, index: 0 }]
        })}`;
      }
      // Tool input accumulation
      if (
        delta?.type === "input_json_delta" &&
        delta.partial_json !== undefined
      ) {
        const idx = (parsed.index as number) ?? 0;
        if (streamToolCalls[idx]) {
          streamToolCalls[idx].arguments += delta.partial_json as string;
        }
        return null;
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
        return `data: ${JSON.stringify({
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
      }
      return null;
    }

    // Message delta (stop reason + usage)
    if (parsed.type === "message_delta") {
      const delta = parsed.delta as { stop_reason?: string } | undefined;
      const usage = parsed.usage as Record<string, number> | undefined;
      const stopReason = delta?.stop_reason;
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

    normalizeRequest,
    normalizeStreamChunk,

    transformBody(body) {
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
