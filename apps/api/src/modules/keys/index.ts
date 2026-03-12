import type { Database } from "@raven/db";
import { Hono } from "hono";
import { jsonValidator } from "@/lib/validation";
import { createKey } from "./create";
import { deleteKey } from "./delete";
import { getKey } from "./get";
import { listKeys } from "./list";
import { createKeySchema, updateKeySchema } from "./schema";
import { updateKey } from "./update";

export const createKeysModule = (db: Database) => {
  const app = new Hono();

  app.get("/", listKeys(db));
  app.get("/:id", getKey(db));
  app.post("/", jsonValidator(createKeySchema), createKey(db));
  app.put("/:id", jsonValidator(updateKeySchema), updateKey(db));
  app.delete("/:id", deleteKey(db));

  return app;
};
