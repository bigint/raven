import type { Database } from "@raven/db";
import { models, providerConfigs } from "@raven/db";
import { count, eq, inArray, notInArray } from "drizzle-orm";
import type { Context } from "hono";
import {
  deriveCapabilities,
  deriveCategory,
  getModelsDevModel,
  SUPPORTED_PROVIDERS,
  searchModels as searchModelsFromDev
} from "@/lib/model-sync";
import { refreshPricingCache } from "@/lib/pricing-cache";

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

export const searchAvailableModels = (db: Database) => async (c: Context) => {
  const provider = c.req.query("provider") ?? "";
  const query = c.req.query("q") ?? "";

  if (!provider) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "provider is required"
        }
      },
      400
    );
  }

  const results = await searchModelsFromDev(provider, query);

  const modelIds = results.map((m) => `${provider}/${m.id}`);
  const existing =
    modelIds.length > 0
      ? await db
          .select({ id: models.id })
          .from(models)
          .where(inArray(models.id, modelIds))
      : [];
  const existingIds = new Set(existing.map((m) => m.id));

  const data = results.map((m) => ({
    ...m,
    isAdded: existingIds.has(`${provider}/${m.id}`)
  }));

  return c.json({ data });
};

export const addModel = (db: Database) => async (c: Context) => {
  const body = await c.req.json<{ provider: string; modelId: string }>();

  if (!body.provider || !body.modelId) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "provider and modelId are required"
        }
      },
      400
    );
  }

  const model = await getModelsDevModel(body.provider, body.modelId);
  if (!model) {
    return c.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Model not found on models.dev"
        }
      },
      404
    );
  }

  const inputPrice = model.cost?.input ?? 0;
  const outputPrice = model.cost?.output ?? 0;
  const id = `${body.provider}/${model.id}`;
  const now = new Date();

  const [inserted] = await db
    .insert(models)
    .values({
      capabilities: deriveCapabilities(model),
      category: deriveCategory(model, inputPrice),
      contextWindow: model.limit?.context ?? 0,
      createdAt: now,
      description: "",
      id,
      inputPrice: inputPrice.toFixed(4),
      maxOutput: model.limit?.output ?? 0,
      name: model.name,
      outputPrice: outputPrice.toFixed(4),
      provider: body.provider,
      slug: model.id,
      updatedAt: now
    })
    .onConflictDoNothing()
    .returning();

  if (!inserted) {
    return c.json(
      { error: { code: "CONFLICT", message: "Model already added" } },
      409
    );
  }

  await refreshPricingCache(db);

  return c.json({ data: inserted }, 201);
};

export const removeModel = (db: Database) => async (c: Context) => {
  const id = c.req.param("id") ?? "";

  if (!id) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Model ID is required"
        }
      },
      400
    );
  }

  const [deleted] = await db
    .delete(models)
    .where(eq(models.id, id))
    .returning();

  if (!deleted) {
    return c.json(
      { error: { code: "NOT_FOUND", message: "Model not found" } },
      404
    );
  }

  await refreshPricingCache(db);

  return c.json({ data: { success: true } });
};

export const refreshModelPricing = (db: Database) => async (c: Context) => {
  const body = await c.req.json<{ provider: string }>();

  if (!body.provider) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "provider is required"
        }
      },
      400
    );
  }

  const existingModels = await db
    .select({ id: models.id, slug: models.slug })
    .from(models)
    .where(eq(models.provider, body.provider));

  if (existingModels.length === 0) {
    return c.json({ data: { updated: 0 } });
  }

  let updated = 0;
  const now = new Date();

  for (const existing of existingModels) {
    const model = await getModelsDevModel(body.provider, existing.slug);
    if (!model) continue;

    const inputPrice = model.cost?.input ?? 0;
    const outputPrice = model.cost?.output ?? 0;

    await db
      .update(models)
      .set({
        capabilities: deriveCapabilities(model),
        category: deriveCategory(model, inputPrice),
        contextWindow: model.limit?.context ?? 0,
        inputPrice: inputPrice.toFixed(4),
        maxOutput: model.limit?.output ?? 0,
        name: model.name,
        outputPrice: outputPrice.toFixed(4),
        updatedAt: now
      })
      .where(eq(models.id, existing.id));

    updated++;
  }

  await refreshPricingCache(db);

  return c.json({ data: { updated } });
};

export const cleanDanglingModels = (db: Database) => async (c: Context) => {
  const validSlugs = SUPPORTED_PROVIDERS.map((p) => p.slug);

  const deletedModels = await db
    .delete(models)
    .where(notInArray(models.provider, validSlugs))
    .returning({ id: models.id });

  const deletedConfigs = await db
    .delete(providerConfigs)
    .where(notInArray(providerConfigs.provider, validSlugs))
    .returning({ id: providerConfigs.id });

  if (deletedModels.length > 0) {
    await refreshPricingCache(db);
  }

  return c.json({
    data: {
      removedConfigs: deletedConfigs.length,
      removedModels: deletedModels.length
    }
  });
};
