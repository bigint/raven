import { unlink } from "node:fs/promises";
import { createId } from "@paralleldrive/cuid2";
import type { QdrantClient } from "@qdrant/js-client-rest";
import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import {
  knowledgeChunks,
  knowledgeCollections,
  knowledgeDocuments
} from "@raven/db";
import { eq } from "drizzle-orm";
import type { Redis } from "ioredis";
import { chunkText } from "./chunker";
import { embedTexts, getOpenAIKey } from "./embedder";
import { log } from "./logger";
import { parseDocx } from "./parsers/docx";
import { parseImage } from "./parsers/image";
import { parseMarkdown } from "./parsers/markdown";
import { parsePdf } from "./parsers/pdf";
import { parseUrl } from "./parsers/url";
import { ensureCollection, upsertVectors } from "./qdrant";
import type { IngestionJob } from "./queue";
import { completeJob, dequeueJob, promoteDelayedJobs, retryJob } from "./queue";

interface WorkerDeps {
  readonly db: Database;
  readonly redis: Redis;
  readonly qdrant: QdrantClient;
  readonly env: Env;
}

const getMimeExtension = (mimeType: string): string => {
  const mimeMap: Record<string, string> = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "docx",
    "image/gif": "gif",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "text/markdown": "md",
    "text/plain": "txt"
  };
  return mimeMap[mimeType] ?? "bin";
};

const extractText = async (
  job: IngestionJob,
  mimeType: string,
  apiKey: string,
  metadata?: Record<string, unknown> | null
): Promise<string> => {
  if (job.type === "url") {
    if (!job.sourceUrl) {
      throw new Error("URL job missing sourceUrl");
    }
    const crawlLimit = typeof metadata?.crawlLimit === "number" ? metadata.crawlLimit : undefined;
    return parseUrl(job.sourceUrl, crawlLimit);
  }

  if (job.type === "image") {
    if (!job.filePath) {
      throw new Error("Image job missing filePath");
    }
    return parseImage(job.filePath, apiKey);
  }

  // type === "file"
  if (!job.filePath) {
    throw new Error("File job missing filePath");
  }

  const ext = getMimeExtension(mimeType).toLowerCase();

  if (ext === "pdf") {
    return parsePdf(job.filePath);
  }

  if (ext === "docx") {
    return parseDocx(job.filePath);
  }

  if (ext === "md" || ext === "txt") {
    return parseMarkdown(job.filePath);
  }

  // Fall back to markdown parser for unknown text-based formats
  return parseMarkdown(job.filePath);
};

const cleanupFile = async (filePath?: string): Promise<void> => {
  if (!filePath) return;
  try {
    await unlink(filePath);
  } catch {
    // File may have already been removed — not a critical failure
  }
};

const processJob = async (
  job: IngestionJob,
  deps: WorkerDeps
): Promise<void> => {
  const { db, qdrant, env } = deps;

  log.info("Processing ingestion job", {
    attempt: job.attempt,
    documentId: job.documentId,
    type: job.type
  });

  // Mark document as processing
  await db
    .update(knowledgeDocuments)
    .set({ status: "processing", updatedAt: new Date() })
    .where(eq(knowledgeDocuments.id, job.documentId));

  // Load collection config
  const collections = await db
    .select()
    .from(knowledgeCollections)
    .where(eq(knowledgeCollections.id, job.collectionId))
    .limit(1);

  if (collections.length === 0) {
    log.info("Collection no longer exists, skipping job", { collectionId: job.collectionId });
    return;
  }

  const collection = collections[0]!;

  // Load document for mimeType
  const documents = await db
    .select()
    .from(knowledgeDocuments)
    .where(eq(knowledgeDocuments.id, job.documentId))
    .limit(1);

  if (documents.length === 0) {
    log.info("Document no longer exists, skipping job", { documentId: job.documentId });
    return;
  }

  const document = documents[0]!;

  // Get OpenAI key
  const apiKey = await getOpenAIKey(db, env.ENCRYPTION_SECRET);

  // Extract text
  const text = await extractText(job, document.mimeType, apiKey, document.metadata);

  if (!text || text.trim().length === 0) {
    throw new Error("Extracted text is empty");
  }

  // Chunk text using collection settings
  const chunks = chunkText(text, {
    chunkOverlap: collection.chunkOverlap,
    chunkSize: collection.chunkSize,
    strategy: collection.chunkStrategy
  });

  if (chunks.length === 0) {
    throw new Error("Chunking produced no chunks");
  }

  // Ensure Qdrant collection exists
  const qdrantCollectionName = `knowledge_${job.collectionId}`;
  await ensureCollection(
    qdrant,
    qdrantCollectionName,
    collection.embeddingDimensions
  );

  // Process in batches to avoid OOM on large documents
  const BATCH_SIZE = 100;
  for (let batchStart = 0; batchStart < chunks.length; batchStart += BATCH_SIZE) {
    const batch = chunks.slice(batchStart, batchStart + BATCH_SIZE);

    log.info("Processing chunk batch", {
      batch: Math.floor(batchStart / BATCH_SIZE) + 1,
      batchSize: batch.length,
      documentId: job.documentId,
      totalChunks: chunks.length
    });

    // Embed batch
    const batchTexts = batch.map((c) => c.content);
    const embeddings = await embedTexts(
      apiKey,
      batchTexts,
      collection.embeddingModel,
      collection.embeddingDimensions
    );

    // Generate IDs and insert to Postgres
    const batchIds = batch.map(() => createId());

    await db.insert(knowledgeChunks).values(
      batch.map((chunk, i) => ({
        chunkIndex: chunk.index,
        collectionId: job.collectionId,
        content: chunk.content,
        documentId: job.documentId,
        id: batchIds[i]!,
        tokenCount: chunk.tokenCount
      }))
    );

    // Upsert vectors to Qdrant
    await upsertVectors(
      qdrant,
      qdrantCollectionName,
      batch.map((chunk, i) => ({
        id: batchIds[i]!,
        payload: {
          chunkIndex: chunk.index,
          collectionId: job.collectionId,
          content: chunk.content,
          documentId: job.documentId
        },
        vector: embeddings[i]!
      }))
    );
  }

  // Compute totals
  const totalTokens = chunks.reduce((sum, c) => sum + c.tokenCount, 0);

  // Mark document as ready
  await db
    .update(knowledgeDocuments)
    .set({
      chunkCount: chunks.length,
      errorMessage: null,
      lastCrawledAt: new Date(),
      status: "ready",
      tokenCount: totalTokens,
      updatedAt: new Date()
    })
    .where(eq(knowledgeDocuments.id, job.documentId));

  log.info("Document ingestion complete", {
    chunkCount: chunks.length,
    documentId: job.documentId,
    tokenCount: totalTokens
  });

  // Clean up temp file if present
  await cleanupFile(job.filePath);
};

export const startWorker = (deps: WorkerDeps): (() => void) => {
  let running = true;

  const loop = async (): Promise<void> => {
    while (running) {
      try {
        await promoteDelayedJobs(deps.redis);
      } catch (err) {
        log.error("Failed to promote delayed jobs", err);
      }

      let job: IngestionJob | null = null;

      try {
        job = await dequeueJob(deps.redis, 5);
      } catch (err) {
        log.error("Failed to dequeue job", err);
        continue;
      }

      if (!job) {
        continue;
      }

      try {
        await processJob(job, deps);
        await completeJob(deps.redis, job);
      } catch (err) {
        log.error("Ingestion job failed", err, {
          attempt: job.attempt,
          documentId: job.documentId,
          type: job.type
        });

        const willRetry = await retryJob(deps.redis, job);

        if (!willRetry) {
          // Max retries exhausted — mark document as failed
          const errorMessage = err instanceof Error ? err.message : String(err);
          try {
            await deps.db
              .update(knowledgeDocuments)
              .set({
                errorMessage,
                status: "failed",
                updatedAt: new Date()
              })
              .where(eq(knowledgeDocuments.id, job.documentId));
          } catch (dbErr) {
            log.error("Failed to mark document as failed", dbErr, {
              documentId: job.documentId
            });
          }

          // Clean up temp file even on permanent failure
          await cleanupFile(job.filePath);
        }
      }
    }
  };

  loop().catch((err) => {
    log.error("Worker loop crashed unexpectedly", err);
  });

  return () => {
    running = false;
  };
};
