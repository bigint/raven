import type { Database } from "@raven/db";
import { Hono } from "hono";
import type { Redis } from "ioredis";
import type { AppEnv } from "@/lib/types";
import { queryValidator } from "@/lib/validation";
import { getAdoptionBreakdown, getAdoptionChart } from "./adoption";
import { getCache } from "./cache";
import { clampAnalyticsRetention } from "./helpers";
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
import { toggleStar } from "./star";
import { getStats } from "./stats";
import { getToolSessions, getToolStats } from "./tools";
import { getUsage } from "./usage";

export const createAnalyticsModule = (db: Database, redis?: Redis) => {
  const app = new Hono<AppEnv>();

  // Clamp analytics date range to plan retention limit
  app.use("*", async (c, next) => {
    if (c.req.path.endsWith("/requests/live") || c.req.path.endsWith("/star"))
      return next();
    const orgId = c.get("orgId");
    const from = c.req.query("from");
    const clamped = await clampAnalyticsRetention(db, orgId, from, redis);
    if (clamped) {
      const url = new URL(c.req.url);
      url.searchParams.set("from", clamped);
      c.req.raw = new Request(url, c.req.raw);
    }
    return next();
  });

  app.get(
    "/stats",
    queryValidator(dateRangeQuerySchema),
    getStats(db, redis)
  );
  app.get(
    "/usage",
    queryValidator(dateRangeQuerySchema),
    getUsage(db, redis)
  );
  app.get(
    "/cache",
    queryValidator(dateRangeQuerySchema),
    getCache(db, redis)
  );
  app.get("/requests/live", getRequestsLive(db));
  app.get("/requests", queryValidator(requestsQuerySchema), getRequests(db));
  app.patch("/requests/:id/star", toggleStar(db));
  app.get("/sessions", queryValidator(sessionsQuerySchema), getSessions(db));
  app.get("/sessions/:sessionId", getSessionById(db));
  app.get("/logs", queryValidator(logsQuerySchema), getLogs(db));
  app.get(
    "/tools/stats",
    queryValidator(dateRangeQuerySchema),
    getToolStats(db, redis)
  );
  app.get(
    "/tools/sessions",
    queryValidator(logsQuerySchema),
    getToolSessions(db)
  );
  app.get(
    "/adoption/chart",
    queryValidator(dateRangeQuerySchema),
    getAdoptionChart(db, redis)
  );
  app.get(
    "/adoption/breakdown",
    queryValidator(adoptionQuerySchema),
    getAdoptionBreakdown(db, redis)
  );
  app.get(
    "/models",
    queryValidator(dateRangeQuerySchema),
    getModels(db, redis)
  );

  return app;
};
