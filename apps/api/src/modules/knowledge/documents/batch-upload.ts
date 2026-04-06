import type { BigRAG } from "@bigrag/client";
import type { Database } from "@raven/db";
import type { Context } from "hono";
import { auditAndPublish } from "@/lib/audit";
import { ValidationError } from "@/lib/errors";
import { created } from "@/lib/response";

const ALLOWED_MIME_TYPES = new Set([
  "application/json",
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/xml",
  "image/bmp",
  "image/gif",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/tiff",
  "image/webp",
  "text/csv",
  "text/html",
  "text/markdown",
  "text/plain",
  "text/tab-separated-values",
  "text/xml"
]);

const MAX_FILE_SIZE = 500 * 1024 * 1024;
const MAX_BATCH_SIZE = 100;

export const batchUploadDocuments =
  (db: Database, bigrag: BigRAG) => async (c: Context) => {
    const user = c.get("user");
    const collectionName = c.req.param("name") as string;

    const body = await c.req.parseBody({ all: true });
    const rawFiles = body["files"];

    const files = Array.isArray(rawFiles)
      ? rawFiles
      : rawFiles
        ? [rawFiles]
        : [];
    const validFiles = files.filter((f): f is File => f instanceof File);

    if (validFiles.length === 0) {
      throw new ValidationError("At least one file must be provided");
    }

    if (validFiles.length > MAX_BATCH_SIZE) {
      throw new ValidationError(`Maximum ${MAX_BATCH_SIZE} files per batch`);
    }

    for (const file of validFiles) {
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        throw new ValidationError(
          `Unsupported file type: ${file.name} (${file.type})`
        );
      }
      if (file.size > MAX_FILE_SIZE) {
        throw new ValidationError(
          `File exceeds the 500MB size limit: ${file.name}`
        );
      }
    }

    const uploadFiles = await Promise.all(
      validFiles.map(
        async (file) =>
          new File([await file.arrayBuffer()], file.name, { type: file.type })
      )
    );

    const result = await bigrag.batchUploadDocuments(
      collectionName,
      uploadFiles
    );

    for (const doc of result.documents) {
      void auditAndPublish(db, user, "document", "created", {
        metadata: { collection: collectionName },
        resourceId: doc.id
      });
    }

    return created(c, result);
  };
