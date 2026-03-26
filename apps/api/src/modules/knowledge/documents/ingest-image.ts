import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { createId } from "@paralleldrive/cuid2";
import type { Database } from "@raven/db";
import { knowledgeDocuments } from "@raven/db";
import type { Context } from "hono";
import type { Redis } from "ioredis";
import { ValidationError } from "@/lib/errors";
import { created } from "@/lib/response";
import { enqueueJob } from "../ingestion/queue";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp"
]);

const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB

export const ingestImage =
  (db: Database, redis: Redis) => async (c: Context) => {
    const collectionId = c.req.param("id") as string;

    const body = await c.req.parseBody();
    const file = body["file"];

    if (!file || typeof file === "string") {
      throw new ValidationError("An image file must be provided");
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      throw new ValidationError(
        "Unsupported image type. Allowed: PNG, JPEG, WebP"
      );
    }

    if (file.size > MAX_IMAGE_SIZE) {
      throw new ValidationError("Image exceeds the 20MB size limit");
    }

    const uploadDir = path.join(os.tmpdir(), "raven-uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    const fileId = createId();
    const ext = path.extname(file.name) || ".jpg";
    const filePath = path.join(uploadDir, `${fileId}${ext}`);

    const buffer = await file.arrayBuffer();
    await fs.writeFile(filePath, Buffer.from(buffer));

    const title = (body["title"] as string | undefined) ?? file.name;

    const [document] = await db
      .insert(knowledgeDocuments)
      .values({
        collectionId,
        fileSize: file.size,
        mimeType: file.type,
        sourceType: "image",
        title
      })
      .returning();

    await enqueueJob(redis, {
      collectionId,
      documentId: (document as NonNullable<typeof document>).id,
      filePath,
      id: createId(),
      type: "image"
    });

    return created(c, document);
  };
