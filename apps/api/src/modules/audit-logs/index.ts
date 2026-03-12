import type { Database } from "@raven/db";
import { Hono } from "hono";
import { queryValidator } from "@/lib/validation";
import { listAuditLogs } from "./list";
import { listQuerySchema } from "./schema";

export { logAudit } from "./log";

export const createAuditLogsModule = (db: Database) => {
  const app = new Hono();
  app.get("/", queryValidator(listQuerySchema), listAuditLogs(db));
  return app;
};
