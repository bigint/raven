import type { Database } from "@raven/db";
import { providerConfigs } from "@raven/db";
import { MODEL_CATALOG } from "@raven/data";
import type { ModelDefinition } from "@raven/types";
import { eq } from "drizzle-orm";
import { Hono } from "hono";

export const createModelsModule = (db: Database) => {
  const app = new Hono();

  app.get("/", async (c) => {
    const provider = c.req.query("provider");

    const configs = await db
      .select({
        models: providerConfigs.models,
        provider: providerConfigs.provider
      })
      .from(providerConfigs)
      .where(eq(providerConfigs.isEnabled, true));

    const seen = new Set<string>();
    const result: ModelDefinition[] = [];

    for (const config of configs) {
      if (provider && config.provider !== provider) continue;
      const models = config.models as string[];
      for (const modelId of models) {
        if (seen.has(modelId)) continue;
        seen.add(modelId);
        const catalogEntry = MODEL_CATALOG[modelId];
        if (catalogEntry) {
          result.push(catalogEntry);
        }
      }
    }

    return c.json({ data: result, object: "list" });
  });

  return app;
};
