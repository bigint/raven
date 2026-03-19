import type { Database } from "@raven/db";
import { Hono } from "hono";
import { jsonValidator } from "@/lib/validation";
import { createModelAlias } from "./create";
import { deleteModelAlias } from "./delete";
import { listModelAliases } from "./list";
import { createModelAliasSchema } from "./schema";

export const createModelAliasesModule = (db: Database, _redis?: unknown) => {
  const app = new Hono();

  app.get("/", listModelAliases(db));
  app.post("/", jsonValidator(createModelAliasSchema), createModelAlias(db));
  app.delete("/:id", deleteModelAlias(db));

  return app;
};
