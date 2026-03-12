import type { Database } from "@raven/db";
import { Hono } from "hono";
import { jsonValidator } from "@/lib/validation";
import { createGuardrail } from "./create";
import { deleteGuardrail } from "./delete";
import { listGuardrails } from "./list";
import { createGuardrailSchema, updateGuardrailSchema } from "./schema";
import { updateGuardrail } from "./update";

export const createGuardrailsModule = (db: Database) => {
  const app = new Hono();

  app.get("/", listGuardrails(db));
  app.post("/", jsonValidator(createGuardrailSchema), createGuardrail(db));
  app.put("/:id", jsonValidator(updateGuardrailSchema), updateGuardrail(db));
  app.delete("/:id", deleteGuardrail(db));

  return app;
};
