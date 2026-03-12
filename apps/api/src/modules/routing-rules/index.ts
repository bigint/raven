import type { Database } from "@raven/db";
import { Hono } from "hono";
import { createRoutingRule } from "./create";
import { deleteRoutingRule } from "./delete";
import { listRoutingRules } from "./list";
import { updateRoutingRule } from "./update";

export const createRoutingRulesModule = (db: Database) => {
  const app = new Hono();

  app.get("/", listRoutingRules(db));
  app.post("/", createRoutingRule(db));
  app.put("/:id", updateRoutingRule(db));
  app.delete("/:id", deleteRoutingRule(db));

  return app;
};
