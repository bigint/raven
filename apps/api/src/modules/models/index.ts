import type { Database } from "@raven/db";
import { providerConfigs } from "@raven/db";
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

    const result: { id: string; object: string; owned_by: string }[] = [];

    for (const config of configs) {
      if (provider && config.provider !== provider) continue;
      const models = config.models as string[];
      for (const model of models) {
        result.push({
          id: model,
          object: "model",
          owned_by: config.provider
        });
      }
    }

    return c.json({ data: result, object: "list" });
  });

  return app;
};
