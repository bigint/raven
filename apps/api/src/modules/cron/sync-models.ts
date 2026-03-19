import type { Database } from "@raven/db";
import { models } from "@raven/db";
import { inArray, sql } from "drizzle-orm";
import type { Context } from "hono";
import type { Redis } from "ioredis";
import {
  deriveCapabilities,
  deriveCategory,
  fetchModelsDevCached,
  PROVIDER_SLUG_MAP
} from "@/lib/model-sync";
import { refreshPricingCache } from "@/lib/pricing-cache";

const LOCK_KEY = "cron:sync-models:lock";
const LOCK_TTL = 300; // 5 minutes

export const syncModels =
  (db: Database, redis: Redis) => async (c: Context) => {
    const acquired = await redis.set(LOCK_KEY, "1", "EX", LOCK_TTL, "NX");
    if (!acquired) {
      return c.json({ skipped: true, reason: "Another sync is in progress" });
    }

    try {
      const data = await fetchModelsDevCached();
      const now = new Date();

      const toUpsert: (typeof models.$inferInsert)[] = [];
      const upstreamIds = new Set<string>();

      for (const [devSlug, ourSlug] of Object.entries(PROVIDER_SLUG_MAP)) {
        const providerData = data[devSlug];
        if (!providerData?.models) continue;

        const upstreamModels = Object.values(providerData.models);

        for (const m of upstreamModels) {
          const id = `${ourSlug}/${m.id}`;
          upstreamIds.add(id);
          const inputPrice = m.cost?.input ?? 0;
          const outputPrice = m.cost?.output ?? 0;

          toUpsert.push({
            capabilities: deriveCapabilities(m),
            category: deriveCategory(m, inputPrice),
            contextWindow: m.limit?.context ?? 0,
            createdAt: now,
            id,
            inputPrice: inputPrice.toFixed(4),
            maxOutput: m.limit?.output ?? 0,
            name: m.name,
            outputPrice: outputPrice.toFixed(4),
            provider: ourSlug,
            slug: m.id,
            updatedAt: now
          });
        }
      }

      // Fetch all existing model IDs in one query for counting and deletion
      const existing = await db.select({ id: models.id }).from(models);
      const existingIds = new Set(existing.map((m) => m.id));

      const added = toUpsert.filter((m) => !existingIds.has(m.id as string)).length;
      const updated = toUpsert.filter((m) => existingIds.has(m.id as string)).length;

      // Batch upsert in chunks to avoid exceeding parameter limits
      if (toUpsert.length > 0) {
        const CHUNK_SIZE = 500;
        for (let i = 0; i < toUpsert.length; i += CHUNK_SIZE) {
          const chunk = toUpsert.slice(i, i + CHUNK_SIZE);
          await db
            .insert(models)
            .values(chunk)
            .onConflictDoUpdate({
              target: models.id,
              set: {
                capabilities: sql`excluded.capabilities`,
                category: sql`excluded.category`,
                contextWindow: sql`excluded.context_window`,
                inputPrice: sql`excluded.input_price`,
                maxOutput: sql`excluded.max_output`,
                name: sql`excluded.name`,
                outputPrice: sql`excluded.output_price`,
                provider: sql`excluded.provider`,
                slug: sql`excluded.slug`,
                updatedAt: sql`excluded.updated_at`
              }
            });
        }
      }

      // Batch delete models no longer upstream
      const toDelete = existing
        .filter((m) => !upstreamIds.has(m.id))
        .map((m) => m.id);
      const removed = toDelete.length;

      if (toDelete.length > 0) {
        await db.delete(models).where(inArray(models.id, toDelete));
      }

      await refreshPricingCache(db);

      return c.json({ data: { added, removed, updated } });
    } finally {
      await redis.del(LOCK_KEY);
    }
  };
