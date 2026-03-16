import type { Database } from "@raven/db";
import { Hono } from "hono";
import { jsonValidator } from "@/lib/validation";
import { createPlugin } from "./create";
import { deletePlugin } from "./delete";
import { listPlugins } from "./list";
import { createPluginSchema, updatePluginSchema } from "./schema";
import { updatePlugin } from "./update";

export const createPluginsModule = (db: Database) => {
  const app = new Hono();

  app.get("/", listPlugins(db));
  app.post("/", jsonValidator(createPluginSchema), createPlugin(db));
  app.put("/:id", jsonValidator(updatePluginSchema), updatePlugin(db));
  app.delete("/:id", deletePlugin(db));

  return app;
};
