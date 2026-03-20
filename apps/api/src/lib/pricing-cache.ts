import type { Database } from "@raven/db";
import { models } from "@raven/db";

/**
 * In-memory pricing cache for fast lookups in the proxy hot path.
 * Keyed by model slug (e.g., "gpt-5", "claude-opus-4-6").
 */
const pricingCache = new Map<string, { input: number; output: number }>();

const ZERO_PRICING = { input: 0, output: 0 };

export const refreshPricingCache = async (db: Database): Promise<void> => {
  const allModels = await db
    .select({
      inputPrice: models.inputPrice,
      outputPrice: models.outputPrice,
      slug: models.slug
    })
    .from(models);

  pricingCache.clear();
  for (const m of allModels) {
    pricingCache.set(m.slug, {
      input: parseFloat(m.inputPrice ?? "0"),
      output: parseFloat(m.outputPrice ?? "0")
    });
  }
};

/**
 * Get pricing for a model by slug.
 * Returns zero if the model is not in the cache.
 */
export const getModelPricing = (
  modelId: string
): { input: number; output: number } => {
  return pricingCache.get(modelId) ?? ZERO_PRICING;
};
