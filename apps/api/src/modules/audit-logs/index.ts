import type { Database } from "@raven/db";
import { Hono } from "hono";
import { listAuditLogs } from "./list.js";

export { logAudit } from "./log.js";

export const createAuditLogsModule = (db: Database) => {
  const app = new Hono();
  app.get("/", listAuditLogs(db));
  return app;
};
