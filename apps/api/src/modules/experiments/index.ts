import type { Database } from "@raven/db";
import { Hono } from "hono";
import type { Redis } from "ioredis";
import { jsonValidator } from "@/lib/validation";
import { createExperiment } from "./create";
import { deleteExperiment } from "./delete";
import { listExperiments } from "./list";
import { getExperimentResults } from "./results";
import { createExperimentSchema, updateExperimentSchema } from "./schema";
import { updateExperiment } from "./update";

export const createExperimentsModule = (db: Database, redis: Redis) => {
  const app = new Hono();

  app.get("/", listExperiments(db));
  app.post("/", jsonValidator(createExperimentSchema), createExperiment(db));
  app.put("/:id", jsonValidator(updateExperimentSchema), updateExperiment(db));
  app.delete("/:id", deleteExperiment(db));
  app.get("/:id/results", getExperimentResults(db, redis));

  return app;
};
