import type { Database } from "@raven/db";
import { Hono } from "hono";
import { queryValidator } from "@/lib/validation";
import { getCache } from "./cache";
import { getRequests } from "./requests";
import { getRequestsLive } from "./requests-live";
import {
  dateRangeQuerySchema,
  requestsQuerySchema,
  sessionsQuerySchema
} from "./schema";
import { getSessionById, getSessions } from "./sessions";
import { getStats } from "./stats";
import { getUsage } from "./usage";

export const createAnalyticsModule = (db: Database) => {
  const app = new Hono();

  app.get("/stats", queryValidator(dateRangeQuerySchema), getStats(db));
  app.get("/usage", queryValidator(dateRangeQuerySchema), getUsage(db));
  app.get("/cache", queryValidator(dateRangeQuerySchema), getCache(db));
  app.get("/requests/live", getRequestsLive(db));
  app.get("/requests", queryValidator(requestsQuerySchema), getRequests(db));
  app.get("/sessions", queryValidator(sessionsQuerySchema), getSessions(db));
  app.get("/sessions/:sessionId", getSessionById(db));

  return app;
};
