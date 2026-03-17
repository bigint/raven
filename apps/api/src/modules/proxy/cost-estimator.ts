import { getModelPricing } from "@/lib/pricing-cache";
import type { TokenUsage } from "./usage-mapper";

/**
 * Provider-specific cache cost multipliers (relative to base input price).
 *
 * Anthropic: cache reads cost 10% of input, writes cost 125%.
 * OpenAI/Mistral: cache reads cost 50% of input, no write cost.
 */
const CACHE_MULTIPLIERS: Record<string, { read: number; write: number }> = {
  anthropic: { read: 0.1, write: 1.25 },
  mistralai: { read: 0.5, write: 0 },
  openai: { read: 0.5, write: 0 }
};

const DEFAULT_MULTIPLIER = { read: 0.5, write: 0 };

export const estimateCost = (
  provider: string,
  model: string,
  usage: TokenUsage
): number => {
  const pricing = getModelPricing(model, provider);
  const mult = CACHE_MULTIPLIERS[provider] ?? DEFAULT_MULTIPLIER;

  const regularInput = Math.max(
    0,
    usage.inputTokens - usage.cacheReadTokens - usage.cacheWriteTokens
  );

  return (
    (regularInput / 1_000_000) * pricing.input +
    (usage.cacheReadTokens / 1_000_000) * pricing.input * mult.read +
    (usage.cacheWriteTokens / 1_000_000) * pricing.input * mult.write +
    (usage.outputTokens / 1_000_000) * pricing.output
  );
};
