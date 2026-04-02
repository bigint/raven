import type { Database } from "@raven/db";
import { Hono } from "hono";
import type { BigRAGClient } from "@/lib/bigrag";
import { queryValidator } from "@/lib/validation";
import { deleteDocument } from "./delete";
import { getDocument, getDocumentChunks } from "./get";
import { ingestImage } from "./ingest-image";
import { listDocuments } from "./list";
import { reprocessDocument } from "./reprocess";
import { listDocumentsQuerySchema } from "./schema";
import { uploadDocument } from "./upload";

export const createDocumentsModule = (db: Database, bigrag: BigRAGClient) => {
  const app = new Hono();

  app.get("/", queryValidator(listDocumentsQuerySchema), listDocuments(db));
  app.post("/", uploadDocument(db, bigrag));
  app.post("/image", ingestImage(db, bigrag));

  return app;
};

export const createDocumentDetailModule = (
  db: Database,
  bigrag: BigRAGClient
) => {
  const app = new Hono();

  app.get("/:id", getDocument(db));
  app.get("/:id/chunks", getDocumentChunks(db, bigrag));
  app.post("/:id/reprocess", reprocessDocument(db, bigrag));
  app.delete("/:id", deleteDocument(db, bigrag));

  return app;
};
