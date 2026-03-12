import type { Database } from "@raven/db";
import { Hono } from "hono";
import { jsonValidator } from "@/lib/validation";
import { createPrompt } from "./create";
import { deletePrompt } from "./delete";
import { getPrompt } from "./get";
import { listPrompts } from "./list";
import {
  createPromptSchema,
  createVersionSchema,
  updatePromptSchema
} from "./schema";
import { updatePrompt } from "./update";
import { activateVersion, createVersion } from "./versions";

export const createPromptsModule = (db: Database) => {
  const app = new Hono();

  app.get("/", listPrompts(db));
  app.get("/:id", getPrompt(db));
  app.post("/", jsonValidator(createPromptSchema), createPrompt(db));
  app.put("/:id", jsonValidator(updatePromptSchema), updatePrompt(db));
  app.delete("/:id", deletePrompt(db));
  app.post(
    "/:id/versions",
    jsonValidator(createVersionSchema),
    createVersion(db)
  );
  app.put("/:id/versions/:versionId/activate", activateVersion(db));

  return app;
};
