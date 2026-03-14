import type { Database } from "@raven/db";
import { models } from "@raven/db";

/**
 * In-memory pricing cache for fast lookups in the proxy hot path.
 * Keyed by model slug (e.g., "gpt-5", "claude-opus-4-6").
 */
const pricingCache = new Map<string, { input: number; output: number }>();

const PROVIDER_DEFAULTS: Record<string, { input: number; output: number }> = {
  anthropic: { input: 3, output: 15 },
  openai: { input: 2.5, output: 10 }
};

const DEFAULT_PRICING = { input: 3, output: 15 };

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
 * Get pricing for a model by slug, with per-provider fallback.
 * Drop-in replacement for the old getModelPricing from @raven/types.
 */
export const getModelPricing = (
  modelId: string,
  provider?: string
): { input: number; output: number } => {
  const exact = pricingCache.get(modelId);
  if (exact) return exact;

  return provider
    ? (PROVIDER_DEFAULTS[provider] ?? DEFAULT_PRICING)
    : DEFAULT_PRICING;
};
