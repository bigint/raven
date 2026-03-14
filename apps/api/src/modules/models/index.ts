import type { Database } from "@raven/db";
import { models } from "@raven/db";
import { and, eq, type SQL } from "drizzle-orm";
import { Hono } from "hono";

export const createModelsModule = (db: Database) => {
  const app = new Hono();

  app.get("/", async (c) => {
    const provider = c.req.query("provider");
    const category = c.req.query("category");

    const conditions: SQL[] = [];
    if (provider) conditions.push(eq(models.provider, provider));
    if (category) conditions.push(eq(models.category, category));

    const result = await db
      .select()
      .from(models)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return c.json({
      data: result.map((m) => ({
        capabilities: m.capabilities,
        category: m.category,
        contextWindow: m.contextWindow,
        description: m.description,
        id: m.id,
        inputPrice: parseFloat(m.inputPrice ?? "0"),
        maxOutput: m.maxOutput,
        name: m.name,
        outputPrice: parseFloat(m.outputPrice ?? "0"),
        provider: m.provider,
        slug: m.slug
      }))
    });
  });

  return app;
};
