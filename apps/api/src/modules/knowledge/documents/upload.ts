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
  "text/csv",
  "text/html",
  "text/markdown",
  "text/plain",
  "text/tab-separated-values",
  "text/xml"
]);

const MAX_FILE_SIZE = 500 * 1024 * 1024;

export const uploadDocument =
  (db: Database, bigrag: BigRAG) => async (c: Context) => {
    const user = c.get("user");
    const collectionName = c.req.param("name") as string;

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

    const uploadFile = new File([await file.arrayBuffer()], file.name, {
      type: file.type
    });
    const document = await bigrag.uploadDocument(collectionName, uploadFile);

    void auditAndPublish(db, user, "document", "created", {
      metadata: { collection: collectionName, title: file.name },
      resourceId: document.id
    });

    return created(c, document);
  };
