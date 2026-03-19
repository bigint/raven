import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import { Hono } from "hono";
import type { Redis } from "ioredis";
import { getPlans } from "./plans";
import { getSubscription } from "./subscription";
import { handleWebhook } from "./webhook";

export const createBillingModule = (db: Database) => {
  const app = new Hono();
  app.get("/subscription", getSubscription(db));
  app.get("/plans", getPlans(db));
  return app;
};

export const createBillingWebhookModule = (
  db: Database,
  env: Env,
  redis: Redis
) => {
  const app = new Hono();
  app.post("/", handleWebhook(db, env, redis));
  return app;
};
