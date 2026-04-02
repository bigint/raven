import type { Database } from "@raven/db";
import { Hono } from "hono";
import type { Redis } from "ioredis";
import type { BigRAGClient } from "@/lib/bigrag";
import { createCollectionsModule } from "./collections/index";
import {
  createDocumentDetailModule,
  createDocumentsModule
} from "./documents/index";
import { createSearchModule } from "./search/index";

export const createKnowledgeModule = (
  db: Database,
  redis: Redis,
  bigrag: BigRAGClient
) => {
  const app = new Hono();
  app.route("/collections", createCollectionsModule(db, bigrag));
  app.route(
    "/collections/:id/documents",
    createDocumentsModule(db, redis, bigrag)
  );
  app.route("/documents", createDocumentDetailModule(db, redis, bigrag));
  app.route("/search", createSearchModule(db, bigrag));
  return app;
};

export { createKeyBindingsModule } from "./key-bindings/index";
