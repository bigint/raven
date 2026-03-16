import { getModelPricing } from "@/lib/pricing-cache";
import { PROVIDERS } from "@/lib/providers";
import type { ProviderAdapter } from "./registry";

interface GeminiContent {
  parts: Array<{ text: string }>;
  role: string;
}

interface GeminiCandidate {
  content?: GeminiContent;
  finishReason?: string;
}

interface GeminiUsageMetadata {
  candidatesTokenCount?: number;
  promptTokenCount?: number;
  totalTokenCount?: number;
}

interface GeminiStreamChunk {
  candidates?: GeminiCandidate[];
  usageMetadata?: GeminiUsageMetadata;
}

export const googleAdapter = (provider: string): ProviderAdapter => {
  const config = PROVIDERS[provider];
  if (!config) throw new Error(`Unknown provider: ${provider}`);

  return {
    baseUrl: config.baseUrl,
    chatEndpoint: config.chatEndpoint,

    estimateCost(model, inputTokens, outputTokens, cacheReadTokens = 0) {
      const pricing = getModelPricing(model, provider);
      const regularInput = Math.max(0, inputTokens - cacheReadTokens);
      const regularInputCost = (regularInput / 1_000_000) * pricing.input;
      const cacheReadCost =
        (cacheReadTokens / 1_000_000) * pricing.input * 0.25;
      const outputCost = (outputTokens / 1_000_000) * pricing.output;
      return regularInputCost + cacheReadCost + outputCost;
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

      const systemInstruction =
        systemMessages.length > 0
          ? {
              parts: systemMessages.map((m) => ({
                text:
                  typeof m.content === "string" ? m.content : String(m.content)
              }))
            }
          : undefined;

      const contents: GeminiContent[] = nonSystemMessages.map((m) => ({
        parts: [
          {
            text: typeof m.content === "string" ? m.content : String(m.content)
          }
        ],
        role: m.role === "assistant" ? "model" : "user"
      }));

      const generationConfig: Record<string, unknown> = {};
      if (body.max_tokens !== undefined)
        generationConfig.maxOutputTokens = body.max_tokens;
      if (body.temperature !== undefined)
        generationConfig.temperature = body.temperature;
      if (body.top_p !== undefined) generationConfig.topP = body.top_p;
      if (body.stop)
        generationConfig.stopSequences = Array.isArray(body.stop)
          ? body.stop
          : [body.stop];

      const result: Record<string, unknown> = {
        contents,
        generationConfig
      };

      if (systemInstruction) result.systemInstruction = systemInstruction;

      if (Array.isArray(body.tools) && body.tools.length > 0) {
        result.tools = [
          {
            functionDeclarations: (
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
              parameters: t.function?.parameters
            }))
          }
        ];
      }

      return result;
    },

    normalizeStreamChunk(line) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) return null;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") return line;

      try {
        const parsed = JSON.parse(data) as GeminiStreamChunk;

        if (parsed.candidates && parsed.candidates.length > 0) {
          const candidate = parsed.candidates[0];
          if (!candidate) return null;

          const text = candidate.content?.parts?.map((p) => p.text).join("");

          if (candidate.finishReason && candidate.finishReason !== "STOP") {
            return `data: ${JSON.stringify({
              choices: [
                {
                  delta: {},
                  finish_reason: candidate.finishReason.toLowerCase(),
                  index: 0
                }
              ]
            })}`;
          }

          if (text !== undefined) {
            const chunk: Record<string, unknown> = {
              choices: [{ delta: { content: text }, index: 0 }]
            };

            if (parsed.usageMetadata) {
              chunk.usage = {
                completion_tokens:
                  parsed.usageMetadata.candidatesTokenCount ?? 0,
                prompt_tokens: parsed.usageMetadata.promptTokenCount ?? 0,
                total_tokens: parsed.usageMetadata.totalTokenCount ?? 0
              };
            }

            return `data: ${JSON.stringify(chunk)}`;
          }
        }

        if (
          parsed.usageMetadata &&
          (!parsed.candidates || parsed.candidates.length === 0)
        ) {
          return `data: ${JSON.stringify({
            choices: [{ delta: {}, finish_reason: "stop", index: 0 }],
            usage: {
              completion_tokens: parsed.usageMetadata.candidatesTokenCount ?? 0,
              prompt_tokens: parsed.usageMetadata.promptTokenCount ?? 0,
              total_tokens: parsed.usageMetadata.totalTokenCount ?? 0
            }
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
