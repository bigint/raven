import type { Database } from "@raven/db";
import { Hono } from "hono";
import { getRequests } from "./requests";
import { getRequestsLive } from "./requests-live";
import { getSessionById, getSessions } from "./sessions";
import { getStats } from "./stats";
import { getUsage } from "./usage";

export const createAnalyticsModule = (db: Database) => {
  const app = new Hono();

  app.get("/stats", getStats(db));
  app.get("/usage", getUsage(db));
  app.get("/requests/live", getRequestsLive(db));
  app.get("/requests", getRequests(db));
  app.get("/sessions", getSessions(db));
  app.get("/sessions/:sessionId", getSessionById(db));

  return app;
};
