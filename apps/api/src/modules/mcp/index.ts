import type { Database } from "@raven/db";
import { Hono } from "hono";
import { jsonValidator } from "@/lib/validation";
import { createMcpServer } from "./create";
import { deleteMcpServer } from "./delete";
import { listMcpServers } from "./list";
import { createMcpServerSchema, updateMcpServerSchema } from "./schema";
import { updateMcpServer } from "./update";

export const createMcpModule = (db: Database) => {
  const app = new Hono();

  app.get("/", listMcpServers(db));
  app.post("/", jsonValidator(createMcpServerSchema), createMcpServer(db));
  app.put("/:id", jsonValidator(updateMcpServerSchema), updateMcpServer(db));
  app.delete("/:id", deleteMcpServer(db));

  return app;
};
