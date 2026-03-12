import type { Database } from "@raven/db";
import { Hono } from "hono";
import { jsonValidator } from "@/lib/validation";
import { createWebhook } from "./create";
import { deleteWebhook } from "./delete";
import { listWebhooks } from "./list";
import { createWebhookSchema, updateWebhookSchema } from "./schema";
import { updateWebhook } from "./update";

export const createWebhooksModule = (db: Database) => {
  const app = new Hono();

  app.get("/", listWebhooks(db));
  app.post("/", jsonValidator(createWebhookSchema), createWebhook(db));
  app.put("/:id", jsonValidator(updateWebhookSchema), updateWebhook(db));
  app.delete("/:id", deleteWebhook(db));

  return app;
};
