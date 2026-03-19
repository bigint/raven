import type { Database } from "@raven/db";
import { Hono } from "hono";
import { jsonValidator } from "@/lib/validation";
import { createWebhook } from "./create";
import { deleteWebhook } from "./delete";
import { listWebhooks } from "./list";
import {
  createWebhookSchema,
  testWebhookSchema,
  updateWebhookSchema
} from "./schema";
import { testWebhook } from "./test";
import { updateWebhook } from "./update";

export const createWebhooksModule = (db: Database, _redis?: unknown) => {
  const app = new Hono();

  app.get("/", listWebhooks(db));
  app.post("/", jsonValidator(createWebhookSchema), createWebhook(db));
  app.post("/test", jsonValidator(testWebhookSchema), testWebhook());
  app.put("/:id", jsonValidator(updateWebhookSchema), updateWebhook(db));
  app.delete("/:id", deleteWebhook(db));

  return app;
};
