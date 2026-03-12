import type { Database } from "@raven/db";
import { Hono } from "hono";
import { listAuditLogs } from "./list";

export { logAudit } from "./log";

export const createAuditLogsModule = (db: Database) => {
  const app = new Hono();
  app.get("/", listAuditLogs(db));
  return app;
};
