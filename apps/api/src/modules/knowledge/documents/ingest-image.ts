import type { BigRAG } from "@bigrag/client";
import type { Database } from "@raven/db";
import type { Context } from "hono";
import { auditAndPublish } from "@/lib/audit";
import { ValidationError } from "@/lib/errors";
import { created } from "@/lib/response";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/bmp",
  "image/gif",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/tiff",
  "image/webp"
]);

const MAX_IMAGE_SIZE = 500 * 1024 * 1024;

export const ingestImage =
  (db: Database, bigrag: BigRAG) => async (c: Context) => {
    const user = c.get("user");
    const collectionName = c.req.param("name") as string;

    const body = await c.req.parseBody();
    const file = body["file"];

    if (!file || typeof file === "string") {
      throw new ValidationError("An image file must be provided");
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      throw new ValidationError(
        "Unsupported image type. Allowed: PNG, JPEG, WebP, GIF, TIFF, BMP"
      );
    }

    if (file.size > MAX_IMAGE_SIZE) {
      throw new ValidationError("Image exceeds the 500MB size limit");
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
