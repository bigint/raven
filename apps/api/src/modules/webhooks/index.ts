import type { Database } from "@raven/db";
import { Hono } from "hono";
import { createWebhook } from "./create";
import { deleteWebhook } from "./delete";
import { listWebhooks } from "./list";
import { updateWebhook } from "./update";

export const createWebhooksModule = (db: Database) => {
  const app = new Hono();

  app.get("/", listWebhooks(db));
  app.post("/", createWebhook(db));
  app.put("/:id", updateWebhook(db));
  app.delete("/:id", deleteWebhook(db));

  return app;
};
