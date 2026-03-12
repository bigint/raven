import type { Database } from "@raven/db";
import { Hono } from "hono";
import { createPrompt } from "./create";
import { deletePrompt } from "./delete";
import { getPrompt } from "./get";
import { listPrompts } from "./list";
import { updatePrompt } from "./update";
import { activateVersion, createVersion } from "./versions";

export const createPromptsModule = (db: Database) => {
  const app = new Hono();

  app.get("/", listPrompts(db));
  app.get("/:id", getPrompt(db));
  app.post("/", createPrompt(db));
  app.put("/:id", updatePrompt(db));
  app.delete("/:id", deletePrompt(db));
  app.post("/:id/versions", createVersion(db));
  app.put("/:id/versions/:versionId/activate", activateVersion(db));

  return app;
};
