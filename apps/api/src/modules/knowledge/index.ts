import type { QdrantClient } from "@qdrant/js-client-rest";
import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import { Hono } from "hono";
import type { Redis } from "ioredis";
import { createCollectionsModule } from "./collections/index";
import {
  createDocumentDetailModule,
  createDocumentsModule
} from "./documents/index";
import { createKeyBindingsModule } from "./key-bindings/index";
import { createSearchModule } from "./search/index";

export const createKnowledgeModule = (
  db: Database,
  redis: Redis,
  qdrant: QdrantClient,
  env: Env
) => {
  const app = new Hono();
  app.route("/collections", createCollectionsModule(db, qdrant));
  app.route(
    "/collections/:id/documents",
    createDocumentsModule(db, redis, qdrant)
  );
  app.route("/documents", createDocumentDetailModule(db, redis, qdrant));
  app.route("/search", createSearchModule(db, redis, qdrant, env));
  return app;
};

export { createKeyBindingsModule } from "./key-bindings/index";
