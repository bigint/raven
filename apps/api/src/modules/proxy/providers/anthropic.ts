import { getModelPricing } from "@/lib/pricing-cache";
import { PROVIDERS } from "@/lib/providers";
import type { ProviderAdapter } from "./registry";

const config = PROVIDERS.anthropic!;

export const anthropicAdapter: ProviderAdapter = {
  baseUrl: config.baseUrl,

  estimateCost(
    model,
    inputTokens,
    outputTokens,
    cacheReadTokens = 0,
    cacheWriteTokens = 0
  ) {
    const pricing = getModelPricing(model, "anthropic");
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
  name: "anthropic",

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
