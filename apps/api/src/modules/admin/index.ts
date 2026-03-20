import type { Database } from "@raven/db";
import { Hono } from "hono";
import type { Redis } from "ioredis";
import { syncModels } from "../cron/sync-models";
import { getAdminAuditLogs } from "./audit-logs";
import { getSettings, updateSettings } from "./settings";
import { getAdminStats } from "./stats";
import { getAdminProviders } from "./synced-providers";
import { deleteUser, getAdminUsers, updateUserRole } from "./users";

export const createAdminModule = (db: Database, redis: Redis) => {
  const app = new Hono();
  app.get("/stats", getAdminStats(db));
  app.get("/users", getAdminUsers(db));
  app.patch("/users/:id", updateUserRole(db));
  app.delete("/users/:id", deleteUser(db));
  app.get("/audit-logs", getAdminAuditLogs(db));
  app.get("/providers", getAdminProviders(db));
  app.post("/models/sync", syncModels(db, redis));
  app.get("/settings", getSettings(db));
  app.put("/settings", updateSettings(db));
  return app;
};
