import type { BigRAG } from "@bigrag/client";
import type { Database } from "@raven/db";
import { Hono } from "hono";
import { queryValidator } from "@/lib/validation";
import { batchDeleteDocuments } from "./batch-delete";
import { batchGetDocumentStatus } from "./batch-status";
import { batchUploadDocuments } from "./batch-upload";
import { deleteDocument } from "./delete";
import { getDocument, getDocumentChunks } from "./get";
import { ingestImage } from "./ingest-image";
import { listDocuments } from "./list";
import { streamDocumentProgress } from "./progress";
import { reprocessDocument } from "./reprocess";
import { listDocumentsQuerySchema } from "./schema";
import { uploadDocument } from "./upload";

export const createDocumentsModule = (db: Database, bigrag: BigRAG) => {
  const app = new Hono();

  app.get(
    "/",
    queryValidator(listDocumentsQuerySchema),
    listDocuments(db, bigrag)
  );
  app.post("/", uploadDocument(db, bigrag));
  app.post("/image", ingestImage(db, bigrag));
  app.post("/batch/upload", batchUploadDocuments(db, bigrag));
  app.post("/batch/status", batchGetDocumentStatus(db, bigrag));
  app.post("/batch/delete", batchDeleteDocuments(db, bigrag));

  return app;
};

export const createDocumentDetailModule = (db: Database, bigrag: BigRAG) => {
  const app = new Hono();

  app.get("/:id", getDocument(db, bigrag));
  app.get("/:id/chunks", getDocumentChunks(db, bigrag));
  app.get("/:id/progress", streamDocumentProgress(db, bigrag));
  app.post("/:id/reprocess", reprocessDocument(db, bigrag));
  app.delete("/:id", deleteDocument(db, bigrag));

  return app;
};
