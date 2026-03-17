import type { Database } from "@raven/db";
import { Hono } from "hono";
import { getAdminAuditLogs } from "./audit-logs";
import { getAdminOrganizations } from "./organizations";
import { getAdminStats } from "./stats";
import {
  addModel,
  cleanDanglingModels,
  getAdminProviders,
  refreshModelPricing,
  removeModel,
  searchAvailableModels
} from "./synced-providers";
import { getAdminUsers } from "./users";

export const createAdminModule = (db: Database) => {
  const app = new Hono();
  app.get("/stats", getAdminStats(db));
  app.get("/users", getAdminUsers(db));
  app.get("/organizations", getAdminOrganizations(db));
  app.get("/audit-logs", getAdminAuditLogs(db));
  app.get("/providers", getAdminProviders(db));
  app.get("/models/search", searchAvailableModels(db));
  app.post("/models", addModel(db));
  app.delete("/models/:id{.+}", removeModel(db));
  app.post("/models/refresh-pricing", refreshModelPricing(db));
  app.post("/models/clean-dangling", cleanDanglingModels(db));
  return app;
};
