import type { Database } from "@raven/db";
import { Hono } from "hono";
import type { Redis } from "ioredis";
import { syncModels } from "../cron/sync-models";
import { getAdminAuditLogs } from "./audit-logs";
import { getAdminStats } from "./stats";
import { getAdminProviders } from "./synced-providers";
import { getAdminUsers } from "./users";

export const createAdminModule = (db: Database, redis: Redis) => {
  const app = new Hono();
  app.get("/stats", getAdminStats(db));
  app.get("/users", getAdminUsers(db));
  app.get("/audit-logs", getAdminAuditLogs(db));
  app.get("/providers", getAdminProviders(db));
  app.post("/models/sync", syncModels(db, redis));
  return app;
};
