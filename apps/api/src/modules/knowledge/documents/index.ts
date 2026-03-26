import type { QdrantClient } from "@qdrant/js-client-rest";
import type { Database } from "@raven/db";
import { Hono } from "hono";
import type { Redis } from "ioredis";
import { jsonValidator, queryValidator } from "@/lib/validation";
import { deleteDocument } from "./delete";
import { getDocument } from "./get";
import { ingestImage } from "./ingest-image";
import { ingestUrl } from "./ingest-url";
import { listDocuments } from "./list";
import { reprocessDocument } from "./reprocess";
import { ingestUrlSchema, listDocumentsQuerySchema } from "./schema";
import { uploadDocument } from "./upload";

export const createDocumentsModule = (
  db: Database,
  redis: Redis,
  qdrant: QdrantClient
) => {
  const app = new Hono();

  app.get("/", queryValidator(listDocumentsQuerySchema), listDocuments(db));
  app.post("/", uploadDocument(db, redis));
  app.post("/url", jsonValidator(ingestUrlSchema), ingestUrl(db, redis));
  app.post("/image", ingestImage(db, redis));

  return app;
};

export const createDocumentDetailModule = (
  db: Database,
  redis: Redis,
  qdrant: QdrantClient
) => {
  const app = new Hono();

  app.get("/:id", getDocument(db));
  app.post("/:id/reprocess", reprocessDocument(db, redis, qdrant));
  app.delete("/:id", deleteDocument(db, qdrant));

  return app;
};
