import type { Database } from "@raven/db";
import { Hono } from "hono";
import { createBudget } from "./create";
import { deleteBudget } from "./delete";
import { listBudgets } from "./list";
import { updateBudget } from "./update";

export const createBudgetsModule = (db: Database) => {
  const app = new Hono();

  app.get("/", listBudgets(db));
  app.post("/", createBudget(db));
  app.put("/:id", updateBudget(db));
  app.delete("/:id", deleteBudget(db));

  return app;
};
