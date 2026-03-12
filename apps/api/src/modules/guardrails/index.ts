import type { Database } from "@raven/db";
import { Hono } from "hono";
import { createGuardrail } from "./create";
import { deleteGuardrail } from "./delete";
import { listGuardrails } from "./list";
import { updateGuardrail } from "./update";

export const createGuardrailsModule = (db: Database) => {
  const app = new Hono();

  app.get("/", listGuardrails(db));
  app.post("/", createGuardrail(db));
  app.put("/:id", updateGuardrail(db));
  app.delete("/:id", deleteGuardrail(db));

  return app;
};
