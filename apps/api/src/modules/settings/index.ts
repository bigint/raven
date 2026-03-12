import type { Database } from "@raven/db";
import { Hono } from "hono";
import { jsonValidator } from "@/lib/validation";
import { deleteSettings } from "./delete";
import { getSettings } from "./get";
import { updateOrgSchema } from "./schema";
import { updateSettings } from "./update";

export const createSettingsModule = (db: Database) => {
  const app = new Hono();
  app.get("/", getSettings(db));
  app.put("/", jsonValidator(updateOrgSchema), updateSettings(db));
  app.delete("/", deleteSettings(db));
  return app;
};
