import type { Database } from "@raven/db";
import { models } from "@raven/db";
import { count } from "drizzle-orm";
import type { Context } from "hono";
import { SUPPORTED_PROVIDERS } from "@/lib/model-sync";

export const getAdminProviders = (db: Database) => async (c: Context) => {
  const counts = await db
    .select({ modelCount: count(models.id), provider: models.provider })
    .from(models)
    .groupBy(models.provider);

  const countMap = new Map(counts.map((c) => [c.provider, c.modelCount]));

  const data = SUPPORTED_PROVIDERS.map((p) => ({
    modelCount: countMap.get(p.slug) ?? 0,
    name: p.name,
    slug: p.slug
  }));

  return c.json({ data });
};
