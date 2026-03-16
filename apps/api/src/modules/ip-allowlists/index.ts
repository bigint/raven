import type { Database } from "@raven/db";
import { Hono } from "hono";
import { jsonValidator } from "@/lib/validation";
import { createIpRule } from "./create";
import { deleteIpRule } from "./delete";
import { listIpRules } from "./list";
import { createIpRuleSchema, updateIpRuleSchema } from "./schema";
import { updateIpRule } from "./update";

export const createIpAllowlistsModule = (db: Database) => {
  const app = new Hono();

  app.get("/", listIpRules(db));
  app.post("/", jsonValidator(createIpRuleSchema), createIpRule(db));
  app.put("/:id", jsonValidator(updateIpRuleSchema), updateIpRule(db));
  app.delete("/:id", deleteIpRule(db));

  return app;
};
