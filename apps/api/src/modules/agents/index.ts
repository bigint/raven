import type { Database } from "@raven/db";
import { Hono } from "hono";
import { jsonValidator } from "@/lib/validation";
import { createAgent } from "./create";
import { deleteAgent } from "./delete";
import { getAgent } from "./get";
import { listAgents } from "./list";
import { createAgentSchema, updateAgentSchema } from "./schema";
import { updateAgent } from "./update";

export const createAgentsModule = (db: Database) => {
  const app = new Hono();

  app.get("/", listAgents(db));
  app.get("/:id", getAgent(db));
  app.post("/", jsonValidator(createAgentSchema), createAgent(db));
  app.put("/:id", jsonValidator(updateAgentSchema), updateAgent(db));
  app.delete("/:id", deleteAgent(db));

  return app;
};
