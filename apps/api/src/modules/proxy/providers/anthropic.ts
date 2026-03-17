import { getModelPricing } from "@/lib/pricing-cache";
import { PROVIDERS } from "@/lib/providers";
import type { ProviderAdapter } from "./registry";

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
        | Array<{ content: unknown; role: string }>
        | undefined;
      if (!messages) return body;

      const systemMessages = messages.filter((m) => m.role === "system");
      const nonSystemMessages = messages.filter((m) => m.role !== "system");

      const systemText =
        systemMessages.length > 0
          ? systemMessages
              .map((m) =>
                typeof m.content === "string" ? m.content : String(m.content)
              )
              .join("\n\n")
          : undefined;

      // Clean messages — only pass fields Anthropic accepts
      let cleanedMessages = nonSystemMessages.map((m) => ({
        content: m.content,
        role: m.role
      }));

      // Anthropic requires conversation to end with a user message.
      // If the last message is assistant, strip it — it's either a prefill
      // or the client echoing back the model's own response.
      if (cleanedMessages[cleanedMessages.length - 1]?.role === "assistant") {
        cleanedMessages = cleanedMessages.slice(0, -1);
      }

      const result: Record<string, unknown> = {
        max_tokens: body.max_tokens ?? 4096,
        messages: cleanedMessages,
        model: body.model,
        stream: body.stream
      };

      if (systemText) result.system = systemText;
      if (body.temperature !== undefined) result.temperature = body.temperature;
      if (body.top_p !== undefined) result.top_p = body.top_p;
      if (body.stop) result.stop_sequences = body.stop;
      if (body.thinking) result.thinking = body.thinking;

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

    normalizeStreamChunk(line) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) return null;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") return line;

      try {
        const parsed = JSON.parse(data) as Record<string, unknown>;

        if (parsed.type === "content_block_delta") {
          const delta = parsed.delta as
            | { text?: string; type?: string }
            | undefined;
          if (delta?.type === "text_delta" && delta.text) {
            return `data: ${JSON.stringify({
              choices: [{ delta: { content: delta.text }, index: 0 }]
            })}`;
          }
        }

        if (parsed.type === "message_delta") {
          const delta = parsed.delta as { stop_reason?: string } | undefined;
          const usage = parsed.usage as Record<string, number> | undefined;
          return `data: ${JSON.stringify({
            choices: [
              {
                delta: {},
                finish_reason: delta?.stop_reason ?? "stop",
                index: 0
              }
            ],
            usage: usage
              ? {
                  completion_tokens: usage.output_tokens ?? 0,
                  prompt_tokens: 0,
                  total_tokens: usage.output_tokens ?? 0
                }
              : undefined
          })}`;
        }

        if (parsed.type === "message_start") {
          const message = parsed.message as Record<string, unknown> | undefined;
          const usage = message?.usage as Record<string, number> | undefined;
          if (usage) {
            return `data: ${JSON.stringify({
              choices: [
                { delta: { content: "", role: "assistant" }, index: 0 }
              ],
              usage: {
                completion_tokens: 0,
                prompt_tokens: usage.input_tokens ?? 0,
                total_tokens: usage.input_tokens ?? 0
              }
            })}`;
          }
        }

        if (parsed.type === "message_stop") {
          return "data: [DONE]";
        }
      } catch {
        return null;
      }

      return null;
    },

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
