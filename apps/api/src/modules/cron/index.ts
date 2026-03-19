import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import { Hono } from "hono";
import { syncModels } from "./sync-models";

export const createCronModule = (db: Database, env: Env) => {
  const app = new Hono();

  app.use("*", async (c, next) => {
    const secret = c.req.header("x-cron-secret");
    if (!env.CRON_SECRET || secret !== env.CRON_SECRET) {
      return c.json(
        {
          detail: "Unauthorized",
          status: 401,
          title: "Unauthorized",
          type: "about:blank"
        },
        { headers: { "Content-Type": "application/problem+json" }, status: 401 }
      );
    }
    return next();
  });

  app.post("/sync-models", syncModels(db));

  return app;
};
