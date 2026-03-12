import type { Database } from "@raven/db";
import { Hono } from "hono";
import { deleteSettings } from "./delete";
import { getSettings } from "./get";
import { updateSettings } from "./update";

export const createSettingsModule = (db: Database) => {
  const app = new Hono();
  app.get("/", getSettings(db));
  app.put("/", updateSettings(db));
  app.delete("/", deleteSettings(db));
  return app;
};
