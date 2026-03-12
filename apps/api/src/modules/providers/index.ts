import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import { Hono } from "hono";
import { createProvider } from "./create";
import { deleteProvider } from "./delete";
import { getProvider } from "./get";
import { listProviders } from "./list";
import { updateProvider } from "./update";

export const createProvidersModule = (db: Database, env: Env) => {
  const app = new Hono();

  app.get("/", listProviders(db));
  app.get("/:id", getProvider(db));
  app.post("/", createProvider(db, env));
  app.put("/:id", updateProvider(db, env));
  app.delete("/:id", deleteProvider(db));

  return app;
};
