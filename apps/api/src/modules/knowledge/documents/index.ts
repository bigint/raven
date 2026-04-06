import type { BigRAG } from "@bigrag/client";
import type { Database } from "@raven/db";
import { Hono } from "hono";
import { batchDeleteDocuments } from "./batch-delete";
import { batchGetDocuments } from "./batch-get";
import { batchGetDocumentStatus } from "./batch-status";
import { batchUploadDocuments } from "./batch-upload";
import { deleteDocument } from "./delete";
import { getDocument, getDocumentChunks } from "./get";
import { ingestImage } from "./ingest-image";
import { listDocuments } from "./list";
import { streamDocumentProgress } from "./progress";
import { reprocessDocument } from "./reprocess";
import { uploadDocument } from "./upload";

export const createDocumentsModule = (db: Database, bigrag: BigRAG) => {
  const app = new Hono();

  app.get("/", listDocuments(bigrag));
  app.post("/", uploadDocument(db, bigrag));
  app.post("/image", ingestImage(db, bigrag));
  app.post("/batch/get", batchGetDocuments(bigrag));
  app.post("/batch/upload", batchUploadDocuments(db, bigrag));
  app.post("/batch/status", batchGetDocumentStatus(bigrag));
  app.post("/batch/delete", batchDeleteDocuments(db, bigrag));

  return app;
};

export const createDocumentDetailModule = (db: Database, bigrag: BigRAG) => {
  const app = new Hono();

  app.get("/:docId", getDocument(bigrag));
  app.get("/:docId/chunks", getDocumentChunks(bigrag));
  app.get("/:docId/progress", streamDocumentProgress(bigrag));
  app.post("/:docId/reprocess", reprocessDocument(bigrag));
  app.delete("/:docId", deleteDocument(db, bigrag));

  return app;
};
