import type { Database } from "@raven/db";
import { models } from "@raven/db";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import {
  deriveCapabilities,
  deriveCategory,
  fetchModelsDevCached,
  PROVIDER_SLUG_MAP
} from "@/lib/model-sync";
import { refreshPricingCache } from "@/lib/pricing-cache";

export const syncModels = (db: Database) => async (c: Context) => {
  const data = await fetchModelsDevCached();
  const now = new Date();

  let added = 0;
  let updated = 0;
  let removed = 0;

  for (const [devSlug, ourSlug] of Object.entries(PROVIDER_SLUG_MAP)) {
    const providerData = data[devSlug];
    if (!providerData?.models) continue;

    const upstreamModels = Object.values(providerData.models);
    const upstreamIds = new Set(
      upstreamModels.map((m) => `${ourSlug}/${m.id}`)
    );

    // Get existing models for this provider
    const existing = await db
      .select({ id: models.id, slug: models.slug })
      .from(models)
      .where(eq(models.provider, ourSlug));

    const existingIds = new Set(existing.map((m) => m.id));

    // Upsert all upstream models
    for (const m of upstreamModels) {
      const id = `${ourSlug}/${m.id}`;
      const inputPrice = m.cost?.input ?? 0;
      const outputPrice = m.cost?.output ?? 0;

      const values = {
        capabilities: deriveCapabilities(m),
        category: deriveCategory(m, inputPrice),
        contextWindow: m.limit?.context ?? 0,
        description: "",
        id,
        inputPrice: inputPrice.toFixed(4),
        maxOutput: m.limit?.output ?? 0,
        name: m.name,
        outputPrice: outputPrice.toFixed(4),
        provider: ourSlug,
        slug: m.id,
        updatedAt: now
      };

      if (existingIds.has(id)) {
        // Update existing
        const { id: _, ...updateValues } = values;
        await db.update(models).set(updateValues).where(eq(models.id, id));
        updated++;
      } else {
        // Insert new
        await db
          .insert(models)
          .values({ ...values, createdAt: now })
          .onConflictDoNothing();
        added++;
      }
    }

    // Remove models no longer upstream
    for (const e of existing) {
      if (!upstreamIds.has(e.id)) {
        await db.delete(models).where(eq(models.id, e.id));
        removed++;
      }
    }
  }

  await refreshPricingCache(db);

  return c.json({ data: { added, removed, updated } });
};
