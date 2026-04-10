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
import { s3Ingest } from "./s3-ingest";
import {
  deleteS3Job,
  getS3Job,
  listS3Jobs,
  resyncS3Job,
  updateS3Job
} from "./s3-jobs";
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
  app.post("/s3", s3Ingest(db, bigrag));
  app.get("/s3-jobs", listS3Jobs(bigrag));
  app.get("/s3-jobs/:jobId", getS3Job(bigrag));
  app.patch("/s3-jobs/:jobId", updateS3Job(bigrag));
  app.delete("/s3-jobs/:jobId", deleteS3Job(bigrag));
  app.post("/s3-jobs/:jobId/resync", resyncS3Job(bigrag));

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
