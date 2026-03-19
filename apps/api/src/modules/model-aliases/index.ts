import type { Database } from "@raven/db";
import { Hono } from "hono";
import type { Redis } from "ioredis";
import { jsonValidator } from "@/lib/validation";
import { createModelAlias } from "./create";
import { deleteModelAlias } from "./delete";
import { listModelAliases } from "./list";
import { createModelAliasSchema } from "./schema";

export const createModelAliasesModule = (db: Database, redis: Redis) => {
  const app = new Hono();

  app.get("/", listModelAliases(db));
  app.post(
    "/",
    jsonValidator(createModelAliasSchema),
    createModelAlias(db, redis)
  );
  app.delete("/:id", deleteModelAlias(db, redis));

  return app;
};
