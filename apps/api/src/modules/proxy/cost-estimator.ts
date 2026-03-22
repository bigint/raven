import { getModelPricing } from "@raven/data";

import type { TokenUsage } from "./usage-mapper";

export const estimateCost = (model: string, usage: TokenUsage): number => {
  const pricing = getModelPricing(model);
  if (!pricing) return 0;

  const inputCost = (usage.inputTokens / 1_000_000) * pricing.inputPrice;
  const outputCost = (usage.outputTokens / 1_000_000) * pricing.outputPrice;
  return inputCost + outputCost;
};
