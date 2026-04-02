import type { Database } from "@raven/db";
import { knowledgeCollections, knowledgeDocuments } from "@raven/db";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import type { BigRAG } from "@bigrag/client";
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
  "text/csv",
  "text/html",
  "text/markdown",
  "text/plain",
  "text/tab-separated-values",
  "text/xml"
]);

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

export const uploadDocument =
  (db: Database, bigrag: BigRAG) => async (c: Context) => {
    const collectionId = c.req.param("id") as string;

    const body = await c.req.parseBody();
    const file = body["file"];

    if (!file || typeof file === "string") {
      throw new ValidationError("A file must be provided");
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      throw new ValidationError(
        "Unsupported file type. Allowed: PDF, DOCX, PPTX, XLSX, HTML, MD, TXT, CSV, TSV, XML, JSON"
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new ValidationError("File exceeds the 500MB size limit");
    }

    const [collection] = await db
      .select({ name: knowledgeCollections.name })
      .from(knowledgeCollections)
      .where(eq(knowledgeCollections.id, collectionId))
      .limit(1);

    if (!collection) {
      throw new NotFoundError("Collection not found");
    }

    const title = (body["title"] as string | undefined) ?? file.name;

    const uploadFile = new File([await file.arrayBuffer()], file.name, {
      type: file.type
    });
    const bigragDoc = await bigrag.uploadDocument(
      collection.name,
      uploadFile
    );

    log.info("Document uploaded to bigRAG", {
      bigragDocumentId: bigragDoc.id,
      collectionName: collection.name
    });

    const [document] = await db
      .insert(knowledgeDocuments)
      .values({
        bigragDocumentId: bigragDoc.id,
        collectionId,
        fileSize: file.size,
        mimeType: file.type,
        sourceType: "file",
        status: "processing",
        title
      })
      .returning();

    return created(c, document);
  };
