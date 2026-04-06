import type { BigRAG } from "@bigrag/client";
import type { Database } from "@raven/db";
import { Hono } from "hono";
import { createCollectionsModule } from "./collections/index";
import {
  createDocumentDetailModule,
  createDocumentsModule
} from "./documents/index";
import { createSearchModule } from "./search/index";

export const createKnowledgeModule = (db: Database, bigrag: BigRAG) => {
  const app = new Hono();
  app.route("/collections", createCollectionsModule(db, bigrag));
  app.route("/collections/:name/documents", createDocumentsModule(db, bigrag));
  app.route("/documents", createDocumentDetailModule(db, bigrag));
  app.route("/search", createSearchModule(bigrag));
  return app;
};

export { createKeyBindingsModule } from "./key-bindings/index";
