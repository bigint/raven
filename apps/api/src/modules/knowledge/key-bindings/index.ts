import type { Database } from "@raven/db";
import { Hono } from "hono";
import { jsonValidator } from "@/lib/validation";
import { getKeyBindings } from "./get";
import { updateKeyBindingsSchema } from "./schema";
import { updateKeyBindings } from "./update";

export const createKeyBindingsModule = (db: Database) => {
  const app = new Hono();
  app.get("/:id/collections", getKeyBindings(db));
  app.put(
    "/:id/collections",
    jsonValidator(updateKeyBindingsSchema),
    updateKeyBindings(db)
  );
  return app;
};
