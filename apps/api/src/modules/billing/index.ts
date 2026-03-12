import type { Database } from "@raven/db";
import { Hono } from "hono";
import { getPlans } from "./plans.js";
import { getSubscription } from "./subscription.js";
import { handleWebhook } from "./webhook.js";

export const createBillingModule = (db: Database) => {
  const app = new Hono();
  app.get("/subscription", getSubscription(db));
  app.get("/plans", getPlans(db));
  return app;
};

export const createBillingWebhookModule = (db: Database) => {
  const app = new Hono();
  app.post("/", handleWebhook(db));
  return app;
};
