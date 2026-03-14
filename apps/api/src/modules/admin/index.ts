import type { Database } from "@raven/db";
import { Hono } from "hono";
import { getAdminAuditLogs } from "./audit-logs";
import { getAdminDomains } from "./domains";
import { getAdminOrganizations } from "./organizations";
import { getAdminStats } from "./stats";
import {
  addSyncedProvider,
  deleteSyncedProvider,
  getAdminSyncedProviders,
  triggerModelSync,
  updateSyncedProvider
} from "./synced-providers";
import { getAdminUsers } from "./users";

export const createAdminModule = (db: Database) => {
  const app = new Hono();
  app.get("/stats", getAdminStats(db));
  app.get("/users", getAdminUsers(db));
  app.get("/organizations", getAdminOrganizations(db));
  app.get("/domains", getAdminDomains(db));
  app.get("/audit-logs", getAdminAuditLogs(db));
  app.get("/synced-providers", getAdminSyncedProviders(db));
  app.post("/synced-providers", addSyncedProvider(db));
  app.patch("/synced-providers/:slug", updateSyncedProvider(db));
  app.delete("/synced-providers/:slug", deleteSyncedProvider(db));
  app.post("/models/sync", triggerModelSync(db));
  return app;
};
