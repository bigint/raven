import type { Database } from "@raven/db";
import { models } from "@raven/db";
import { inArray, sql } from "drizzle-orm";
import type { Context } from "hono";
import type { Redis } from "ioredis";
import {
  deriveCapabilities,
  deriveCategory,
  extractModelSlug,
  fetchModelsCached,
  resolveProvider,
  toPerMillion
} from "@/lib/model-sync";
import { refreshPricingCache } from "@/lib/pricing-cache";
import { success } from "@/lib/response";

const LOCK_KEY = "cron:sync-models:lock";
const LOCK_TTL = 300; // 5 minutes

// Standalone function for cron container
export const syncModelsJob = async (db: Database, redis: Redis) => {
  const acquired = await redis.set(LOCK_KEY, "1", "EX", LOCK_TTL, "NX");
  if (!acquired) {
    return;
  }

  try {
    const data = await fetchModelsCached();
    const now = new Date();

    const toUpsert: (typeof models.$inferInsert)[] = [];
    const upstreamIds = new Set<string>();

    for (const m of data) {
      if (m.type !== "language") continue;

      const provider = resolveProvider(m);
      if (!provider) continue;

      const id = `${provider}/${extractModelSlug(m.id)}`;
      upstreamIds.add(id);
      const inputPrice = toPerMillion(m.pricing?.input);
      const outputPrice = toPerMillion(m.pricing?.output);

      toUpsert.push({
        capabilities: deriveCapabilities(m),
        category: deriveCategory(m, inputPrice),
        contextWindow: m.context_window ?? 0,
        createdAt: now,
        id,
        inputPrice: inputPrice.toFixed(4),
        maxOutput: m.max_tokens ?? 0,
        name: m.name,
        outputPrice: outputPrice.toFixed(4),
        provider,
        slug: extractModelSlug(m.id),
        updatedAt: now
      });
    }

    // Fetch all existing model IDs for deletion check
    const existing = await db.select({ id: models.id }).from(models);

    // Batch upsert in chunks to avoid exceeding parameter limits
    if (toUpsert.length > 0) {
      const CHUNK_SIZE = 500;
      for (let i = 0; i < toUpsert.length; i += CHUNK_SIZE) {
        const chunk = toUpsert.slice(i, i + CHUNK_SIZE);
        await db
          .insert(models)
          .values(chunk)
          .onConflictDoUpdate({
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
            },
            target: models.id
          });
      }
    }

    // Batch delete models no longer upstream
    const toDelete = existing
      .filter((m) => !upstreamIds.has(m.id))
      .map((m) => m.id);

    if (toDelete.length > 0) {
      await db.delete(models).where(inArray(models.id, toDelete));
    }

    await refreshPricingCache(db);
  } finally {
    await redis.del(LOCK_KEY);
  }
};

// Hono handler for admin route
export const syncModels =
  (db: Database, redis: Redis) => async (c: Context) => {
    await syncModelsJob(db, redis);
    return success(c, { synced: true });
  };
