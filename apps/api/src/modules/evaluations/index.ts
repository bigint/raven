import type { Database } from "@raven/db";
import { Hono } from "hono";
import { jsonValidator } from "@/lib/validation";
import { createEvaluation } from "./create";
import { deleteEvaluation } from "./delete";
import { getEvaluation } from "./get";
import { listEvaluations } from "./list";
import { runEvaluation } from "./run";
import { createEvaluationSchema, runEvaluationSchema } from "./schema";

export const createEvaluationsModule = (db: Database) => {
  const app = new Hono();

  app.get("/", listEvaluations(db));
  app.get("/:id", getEvaluation(db));
  app.post("/", jsonValidator(createEvaluationSchema), createEvaluation(db));
  app.post("/:id/run", jsonValidator(runEvaluationSchema), runEvaluation(db));
  app.delete("/:id", deleteEvaluation(db));

  return app;
};
