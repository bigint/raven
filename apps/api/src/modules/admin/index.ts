import type { Database } from "@raven/db";
import { Hono } from "hono";
import { getAdminAuditLogs } from "./audit-logs";
import {
  createInvitation,
  deleteInvitation,
  listInvitations
} from "./invitations";
import { getSettings, updateSettings } from "./settings";
import { getAdminStats } from "./stats";
import { deleteUser, getAdminUsers, updateUserRole } from "./users";

export const createAdminModule = (db: Database, appUrl: string) => {
  const app = new Hono();
  app.get("/stats", getAdminStats(db));
  app.get("/users", getAdminUsers(db));
  app.patch("/users/:id", updateUserRole(db));
  app.delete("/users/:id", deleteUser(db));
  app.get("/invitations", listInvitations(db));
  app.post("/invitations", createInvitation(db, appUrl));
  app.delete("/invitations/:id", deleteInvitation(db));
  app.get("/audit-logs", getAdminAuditLogs(db));
  app.get("/settings", getSettings(db));
  app.put("/settings", updateSettings(db));
  return app;
};
