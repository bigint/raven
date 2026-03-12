import type { Database } from "@raven/db";
import { Hono } from "hono";
import { jsonValidator } from "@/lib/validation";
import { createBudget } from "./create";
import { deleteBudget } from "./delete";
import { listBudgets } from "./list";
import { createBudgetSchema, updateBudgetSchema } from "./schema";
import { updateBudget } from "./update";

export const createBudgetsModule = (db: Database) => {
  const app = new Hono();

  app.get("/", listBudgets(db));
  app.post("/", jsonValidator(createBudgetSchema), createBudget(db));
  app.put("/:id", jsonValidator(updateBudgetSchema), updateBudget(db));
  app.delete("/:id", deleteBudget(db));

  return app;
};
