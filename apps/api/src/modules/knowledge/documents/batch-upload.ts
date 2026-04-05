import type { BigRAG } from "@bigrag/client";
import type { Database } from "@raven/db";
import { knowledgeCollections, knowledgeDocuments } from "@raven/db";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { log } from "@/lib/logger";
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

const IMAGE_MIME_TYPES = new Set([
  "image/bmp",
  "image/gif",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/tiff",
  "image/webp"
]);

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const MAX_BATCH_SIZE = 100;

export const batchUploadDocuments =
  (db: Database, bigrag: BigRAG) => async (c: Context) => {
    const collectionId = c.req.param("id") as string;

    const body = await c.req.parseBody({ all: true });
    const rawFiles = body["files"];

    const files = Array.isArray(rawFiles) ? rawFiles : rawFiles ? [rawFiles] : [];
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

    const [collection] = await db
      .select({ name: knowledgeCollections.name })
      .from(knowledgeCollections)
      .where(eq(knowledgeCollections.id, collectionId))
      .limit(1);

    if (!collection) {
      throw new NotFoundError("Collection not found");
    }

    const uploadFiles = await Promise.all(
      validFiles.map(async (file) =>
        new File([await file.arrayBuffer()], file.name, { type: file.type })
      )
    );

    const batchResult = await bigrag.batchUploadDocuments(
      collection.name,
      uploadFiles
    );

    log.info("Batch uploaded to bigRAG", {
      collectionName: collection.name,
      count: batchResult.documents.length
    });

    const documents = await db
      .insert(knowledgeDocuments)
      .values(
        batchResult.documents.map((bigragDoc, i) => {
          const file = validFiles[i]!;
          return {
            bigragDocumentId: bigragDoc.id,
            collectionId,
            fileSize: file.size,
            mimeType: file.type,
            sourceType: IMAGE_MIME_TYPES.has(file.type)
              ? ("image" as const)
              : ("file" as const),
            status: "processing" as const,
            title: file.name
          };
        })
      )
      .returning();

    return created(c, documents);
  };
