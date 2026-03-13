import type { Database } from "@raven/db";
import { Hono } from "hono";
import type { AppEnv } from "@/lib/types";
import { queryValidator } from "@/lib/validation";
import { getAdoptionBreakdown, getAdoptionChart } from "./adoption";
import { getCache } from "./cache";
import { enforceAnalyticsRetention } from "./helpers";
import { getLogs } from "./logs";
import { getModels } from "./models";
import { getRequests } from "./requests";
import { getRequestsLive } from "./requests-live";
import {
  adoptionQuerySchema,
  dateRangeQuerySchema,
  logsQuerySchema,
  requestsQuerySchema,
  sessionsQuerySchema
} from "./schema";
import { getSessionById, getSessions } from "./sessions";
import { getStats } from "./stats";
import { getToolSessions, getToolStats } from "./tools";
import { getUsage } from "./usage";

export const createAnalyticsModule = (db: Database) => {
  const app = new Hono<AppEnv>();

  // Enforce analytics retention based on org plan
  app.use("*", async (c, next) => {
    // Skip retention check for live streaming endpoint
    if (c.req.path.endsWith("/requests/live")) return next();
    const orgId = c.get("orgId");
    const from = c.req.query("from");
    await enforceAnalyticsRetention(db, orgId, from);
    return next();
  });

  app.get("/stats", queryValidator(dateRangeQuerySchema), getStats(db));
  app.get("/usage", queryValidator(dateRangeQuerySchema), getUsage(db));
  app.get("/cache", queryValidator(dateRangeQuerySchema), getCache(db));
  app.get("/requests/live", getRequestsLive(db));
  app.get("/requests", queryValidator(requestsQuerySchema), getRequests(db));
  app.get("/sessions", queryValidator(sessionsQuerySchema), getSessions(db));
  app.get("/sessions/:sessionId", getSessionById(db));
  app.get("/logs", queryValidator(logsQuerySchema), getLogs(db));
  app.get(
    "/tools/stats",
    queryValidator(dateRangeQuerySchema),
    getToolStats(db)
  );
  app.get(
    "/tools/sessions",
    queryValidator(logsQuerySchema),
    getToolSessions(db)
  );
  app.get(
    "/adoption/chart",
    queryValidator(dateRangeQuerySchema),
    getAdoptionChart(db)
  );
  app.get(
    "/adoption/breakdown",
    queryValidator(adoptionQuerySchema),
    getAdoptionBreakdown(db)
  );
  app.get("/models", queryValidator(dateRangeQuerySchema), getModels(db));

  return app;
};
