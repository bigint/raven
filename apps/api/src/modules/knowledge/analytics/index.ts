import type { BigRAG } from "@bigrag/client";
import type { Database } from "@raven/db";
import { Hono } from "hono";
import { getQueryLogs } from "./query-logs";
import { getKnowledgeStats } from "./stats";

export const createKnowledgeAnalyticsModule = (
  db: Database,
  bigrag: BigRAG
) => {
  const app = new Hono();
  app.get("/analytics", getKnowledgeStats(db, bigrag));
  app.get("/query-logs", getQueryLogs(db));
  app.get("/health", async (c) => {
    const res = await bigrag.health();
    return c.json(res);
  });
  return app;
};
