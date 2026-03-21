import type { TokenUsage } from "./usage-mapper";

export const estimateCost = (
  _provider: string,
  _model: string,
  _usage: TokenUsage
): number => {
  // Pricing data not available without models table.
  return 0;
};
