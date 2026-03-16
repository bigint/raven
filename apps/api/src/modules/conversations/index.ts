import type { Database } from "@raven/db";
import { Hono } from "hono";
import { jsonValidator } from "@/lib/validation";
import { addMessage } from "./add-message";
import { compactConversation } from "./compact";
import { createConversation } from "./create";
import { deleteConversation } from "./delete";
import { getConversation } from "./get";
import { listConversations } from "./list";
import {
  addMessageSchema,
  compactSchema,
  createConversationSchema
} from "./schema";

export const createConversationsModule = (db: Database) => {
  const app = new Hono();

  app.get("/", listConversations(db));
  app.get("/:id", getConversation(db));
  app.post(
    "/",
    jsonValidator(createConversationSchema),
    createConversation(db)
  );
  app.post("/:id/messages", jsonValidator(addMessageSchema), addMessage(db));
  app.post(
    "/:id/compact",
    jsonValidator(compactSchema),
    compactConversation(db)
  );
  app.delete("/:id", deleteConversation(db));

  return app;
};
