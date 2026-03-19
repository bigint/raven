import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import { Hono } from "hono";
import type { Redis } from "ioredis";
import { jsonValidator } from "@/lib/validation";
import { listAvailableProviders } from "./available";
import { createProvider } from "./create";
import { deleteProvider } from "./delete";
import { listProviders } from "./list";
import { listProviderModels } from "./models";
import { createProviderSchema, updateProviderSchema } from "./schema";
import { testProvider } from "./test";
import { updateProvider } from "./update";

export const createProvidersModule = (db: Database, env: Env, redis: Redis) => {
  const app = new Hono();

  app.get("/available", listAvailableProviders());
  app.get("/", listProviders(db));
  app.get("/:id/models", listProviderModels(db, env, redis));
  app.post("/:id/test", testProvider(db, env));
  app.post("/", jsonValidator(createProviderSchema), createProvider(db, env));
  app.put("/:id", jsonValidator(updateProviderSchema), updateProvider(db, env));
  app.delete("/:id", deleteProvider(db));

  return app;
};
