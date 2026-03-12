import type { Database } from "@raven/db";
import { Hono } from "hono";
import { jsonValidator } from "@/lib/validation";
import { createRoutingRule } from "./create";
import { deleteRoutingRule } from "./delete";
import { listRoutingRules } from "./list";
import { createRoutingRuleSchema, updateRoutingRuleSchema } from "./schema";
import { updateRoutingRule } from "./update";

export const createRoutingRulesModule = (db: Database) => {
  const app = new Hono();

  app.get("/", listRoutingRules(db));
  app.post("/", jsonValidator(createRoutingRuleSchema), createRoutingRule(db));
  app.put(
    "/:id",
    jsonValidator(updateRoutingRuleSchema),
    updateRoutingRule(db)
  );
  app.delete("/:id", deleteRoutingRule(db));

  return app;
};
