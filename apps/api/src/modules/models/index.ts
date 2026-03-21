import { getModelsForProvider } from "@raven/data";
import type { Database } from "@raven/db";
import { providerConfigs } from "@raven/db";
import type { ModelDefinition } from "@raven/types";
import { eq } from "drizzle-orm";
import { Hono } from "hono";

export const createModelsModule = (db: Database) => {
  const app = new Hono();

  app.get("/", async (c) => {
    const provider = c.req.query("provider");

    const configs = await db
      .select({ provider: providerConfigs.provider })
      .from(providerConfigs)
      .where(eq(providerConfigs.isEnabled, true));

    const seen = new Set<string>();
    const result: ModelDefinition[] = [];

    for (const config of configs) {
      if (provider && config.provider !== provider) continue;
      if (seen.has(config.provider)) continue;
      seen.add(config.provider);

      for (const model of getModelsForProvider(config.provider)) {
        result.push(model);
      }
    }

    return c.json({ data: result, object: "list" });
  });

  return app;
};
