import type { Database } from "@raven/db";
import { Hono } from "hono";
import type { Redis } from "ioredis";
import type { BigRAGClient } from "@/lib/bigrag";
import { jsonValidator, queryValidator } from "@/lib/validation";
import { deleteDocument } from "./delete";
import { getDocument, getDocumentChunks } from "./get";
import { ingestImage } from "./ingest-image";
import { ingestUrl } from "./ingest-url";
import { listDocuments } from "./list";
import { reprocessDocument } from "./reprocess";
import { ingestUrlSchema, listDocumentsQuerySchema } from "./schema";
import { uploadDocument } from "./upload";

export const createDocumentsModule = (
  db: Database,
  redis: Redis,
  bigrag: BigRAGClient
) => {
  const app = new Hono();

  app.get("/", queryValidator(listDocumentsQuerySchema), listDocuments(db));
  app.post("/", uploadDocument(db, bigrag));
  app.post("/url", jsonValidator(ingestUrlSchema), ingestUrl(db, redis));
  app.post("/image", ingestImage(db, bigrag));

  return app;
};

export const createDocumentDetailModule = (
  db: Database,
  redis: Redis,
  bigrag: BigRAGClient
) => {
  const app = new Hono();

  app.get("/:id", getDocument(db));
  app.get("/:id/chunks", getDocumentChunks(db, bigrag));
  app.post("/:id/reprocess", reprocessDocument(db, redis, bigrag));
  app.delete("/:id", deleteDocument(db, bigrag));

  return app;
};
