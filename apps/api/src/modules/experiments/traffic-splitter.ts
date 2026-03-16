import type { Redis } from "ioredis";

interface ExperimentVariant {
  id: string;
  name: string;
  model: string;
  provider?: string;
  weight: number;
}

interface TrafficSplitResult {
  experimentId: string;
  variantId: string;
  variantName: string;
  model: string;
  provider?: string;
}

/** Weighted random selection across experiment variants */
export const splitTraffic = async (
  redis: Redis,
  _orgId: string,
  _model: string,
  variants: ExperimentVariant[]
): Promise<TrafficSplitResult | null> => {
  if (variants.length === 0) return null;

  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
  const random = Math.random() * totalWeight;

  let cumulative = 0;
  for (const variant of variants) {
    cumulative += variant.weight;
    if (random <= cumulative) {
      // Track assignment for analytics
      const counterKey = `exp:${_orgId}:${variant.id}:count`;
      await redis.incr(counterKey);
      await redis.expire(counterKey, 604800); // 7 days

      return {
        experimentId: variant.id,
        model: variant.model,
        provider: variant.provider,
        variantId: variant.id,
        variantName: variant.name
      };
    }
  }

  // Fallback to first variant
  const first = variants[0] as ExperimentVariant;
  return {
    experimentId: first.id,
    model: first.model,
    provider: first.provider,
    variantId: first.id,
    variantName: first.name
  };
};
