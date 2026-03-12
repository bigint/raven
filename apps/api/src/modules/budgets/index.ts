import type { Database } from "@raven/db";
import { Hono } from "hono";
import { createBudget } from "./create.js";
import { deleteBudget } from "./delete.js";
import { listBudgets } from "./list.js";
import { updateBudget } from "./update.js";

export const createBudgetsModule = (db: Database) => {
  const app = new Hono();

  app.get("/", listBudgets(db));
  app.post("/", createBudget(db));
  app.put("/:id", updateBudget(db));
  app.delete("/:id", deleteBudget(db));

  return app;
};
