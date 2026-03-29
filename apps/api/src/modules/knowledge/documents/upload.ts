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
import { hasOpenAIProvider } from "../ingestion/embedder";
import { enqueueJob } from "../ingestion/queue";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/markdown",
  "text/plain"
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export const uploadDocument =
  (db: Database, redis: Redis) => async (c: Context) => {
    const collectionId = c.req.param("id") as string;

    if (!(await hasOpenAIProvider(db))) {
      throw new ValidationError(
        "No OpenAI provider configured. Add an OpenAI provider before ingesting documents."
      );
    }

    const body = await c.req.parseBody();
    const file = body["file"];

    if (!file || typeof file === "string") {
      throw new ValidationError("A file must be provided");
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      throw new ValidationError(
        "Unsupported file type. Allowed: PDF, plain text, markdown, DOCX"
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new ValidationError("File exceeds the 50MB size limit");
    }

    const uploadDir = path.join(os.tmpdir(), "raven-uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    const fileId = createId();
    const ext = path.extname(file.name);
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
        sourceType: "file",
        title
      })
      .returning();

    await enqueueJob(redis, {
      collectionId,
      documentId: (document as NonNullable<typeof document>).id,
      filePath,
      id: createId(),
      type: "file"
    });

    return created(c, document);
  };
