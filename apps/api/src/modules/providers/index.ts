import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import { Hono } from "hono";
import { jsonValidator } from "@/lib/validation";
import { listAvailableProviders } from "./available";
import { createProvider } from "./create";
import { deleteProvider } from "./delete";
import { getProvider } from "./get";
import { listProviders } from "./list";
import { createProviderSchema, updateProviderSchema } from "./schema";
import { updateProvider } from "./update";

export const createProvidersModule = (db: Database, env: Env) => {
  const app = new Hono();

  app.get("/available", listAvailableProviders(db));
  app.get("/", listProviders(db));
  app.get("/:id", getProvider(db));
  app.post("/", jsonValidator(createProviderSchema), createProvider(db, env));
  app.put("/:id", jsonValidator(updateProviderSchema), updateProvider(db, env));
  app.delete("/:id", deleteProvider(db));

  return app;
};
