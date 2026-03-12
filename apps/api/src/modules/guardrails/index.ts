import type { Database } from "@raven/db";
import { Hono } from "hono";
import { createGuardrail } from "./create.js";
import { deleteGuardrail } from "./delete.js";
import { listGuardrails } from "./list.js";
import { updateGuardrail } from "./update.js";

export const createGuardrailsModule = (db: Database) => {
  const app = new Hono();

  app.get("/", listGuardrails(db));
  app.post("/", createGuardrail(db));
  app.put("/:id", updateGuardrail(db));
  app.delete("/:id", deleteGuardrail(db));

  return app;
};
