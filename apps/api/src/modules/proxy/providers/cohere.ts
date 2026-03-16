import { getModelPricing } from "@/lib/pricing-cache";
import { PROVIDERS } from "@/lib/providers";
import type { ProviderAdapter } from "./registry";

interface CohereMessage {
  content: string;
  role: string;
}

interface CohereStreamEvent {
  delta?: {
    finish_reason?: string;
    message?: {
      content?: { text?: string };
      tool_calls?: unknown[];
    };
    usage?: {
      billed_units?: {
        input_tokens?: number;
        output_tokens?: number;
      };
      tokens?: {
        input_tokens?: number;
        output_tokens?: number;
      };
    };
  };
  type: string;
}

export const cohereAdapter = (provider: string): ProviderAdapter => {
  const config = PROVIDERS[provider];
  if (!config) throw new Error(`Unknown provider: ${provider}`);

  return {
    baseUrl: config.baseUrl,
    chatEndpoint: config.chatEndpoint,

    estimateCost(model, inputTokens, outputTokens) {
      const pricing = getModelPricing(model, provider);
      const inputCost = (inputTokens / 1_000_000) * pricing.input;
      const outputCost = (outputTokens / 1_000_000) * pricing.output;
      return inputCost + outputCost;
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

      const preamble =
        systemMessages.length > 0
          ? systemMessages
              .map((m) =>
                typeof m.content === "string" ? m.content : String(m.content)
              )
              .join("\n\n")
          : undefined;

      const cohereMessages: CohereMessage[] = nonSystemMessages.map((m) => ({
        content: typeof m.content === "string" ? m.content : String(m.content),
        role: m.role === "assistant" ? "assistant" : "user"
      }));

      const result: Record<string, unknown> = {
        messages: cohereMessages,
        model: body.model,
        stream: body.stream
      };

      if (preamble) result.preamble = preamble;
      if (body.temperature !== undefined) result.temperature = body.temperature;
      if (body.top_p !== undefined) result.p = body.top_p;
      if (body.max_tokens !== undefined) result.max_tokens = body.max_tokens;
      if (body.stop)
        result.stop_sequences = Array.isArray(body.stop)
          ? body.stop
          : [body.stop];

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
          name: t.function?.name,
          parameter_definitions: t.function?.parameters
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
        const parsed = JSON.parse(data) as CohereStreamEvent;

        if (parsed.type === "content-delta") {
          const text = parsed.delta?.message?.content?.text;
          if (text !== undefined) {
            return `data: ${JSON.stringify({
              choices: [{ delta: { content: text }, index: 0 }]
            })}`;
          }
        }

        if (parsed.type === "message-end") {
          const usage = parsed.delta?.usage;
          const tokens = usage?.billed_units ?? usage?.tokens;

          return `data: ${JSON.stringify({
            choices: [
              {
                delta: {},
                finish_reason:
                  parsed.delta?.finish_reason?.toLowerCase() ?? "stop",
                index: 0
              }
            ],
            usage: tokens
              ? {
                  completion_tokens: tokens.output_tokens ?? 0,
                  prompt_tokens: tokens.input_tokens ?? 0,
                  total_tokens:
                    (tokens.input_tokens ?? 0) + (tokens.output_tokens ?? 0)
                }
              : undefined
          })}`;
        }

        if (parsed.type === "message-start") {
          return `data: ${JSON.stringify({
            choices: [{ delta: { content: "", role: "assistant" }, index: 0 }]
          })}`;
        }
      } catch {
        return null;
      }

      return null;
    },

    transformHeaders(apiKey, headers) {
      return {
        ...headers,
        ...config.authHeaders(apiKey)
      };
    }
  };
};
