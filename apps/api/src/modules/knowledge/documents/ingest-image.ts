import type { Database } from "@raven/db";
import { knowledgeCollections, knowledgeDocuments } from "@raven/db";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import type { BigRAG } from "@bigrag/client";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { log } from "@/lib/logger";
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

const MAX_IMAGE_SIZE = 500 * 1024 * 1024; // 500MB

export const ingestImage =
  (db: Database, bigrag: BigRAG) => async (c: Context) => {
    const collectionId = c.req.param("id") as string;

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

    log.info("Image uploaded to bigRAG", {
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
        sourceType: "image",
        status: "processing",
        title
      })
      .returning();

    return created(c, document);
  };
