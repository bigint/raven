import type { Database } from "@raven/db";
import { Hono } from "hono";
import { getAdminAuditLogs } from "./audit-logs";
import { getAdminDomains } from "./domains";
import { getAdminOrganizations } from "./organizations";
import { getAdminStats } from "./stats";
import { getAdminUsers } from "./users";

export const createAdminModule = (db: Database) => {
  const app = new Hono();
  app.get("/stats", getAdminStats(db));
  app.get("/users", getAdminUsers(db));
  app.get("/organizations", getAdminOrganizations(db));
  app.get("/domains", getAdminDomains(db));
  app.get("/audit-logs", getAdminAuditLogs(db));
  return app;
};
