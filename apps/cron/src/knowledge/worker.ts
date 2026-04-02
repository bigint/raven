import { unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createId } from "@paralleldrive/cuid2";
import type { Database } from "@raven/db";
import { knowledgeCollections, knowledgeDocuments } from "@raven/db";
import { eq } from "drizzle-orm";
import type { Redis } from "ioredis";
import type { BigRAGClient } from "../lib/bigrag";
import { log } from "./logger";
import { crawlUrl } from "./parsers/url";
import type { IngestionJob } from "./queue";
import {
  completeJob,
  dequeueJob,
  promoteDelayedJobs,
  recoverStuckJobs,
  retryJob
} from "./queue";

interface WorkerDeps {
  readonly bigrag: BigRAGClient;
  readonly db: Database;
  readonly redis: Redis;
}

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
  const { bigrag, db } = deps;

  log.info("Processing ingestion job", {
    attempt: job.attempt,
    documentId: job.documentId,
    type: job.type
  });

  if (job.type !== "url") {
    throw new Error(
      `Unexpected job type "${job.type}" — only URL jobs are handled by the cron worker. File/image uploads go directly to bigRAG from the API.`
    );
  }

  if (!job.sourceUrl) {
    throw new Error("URL job missing sourceUrl");
  }

  // Mark document as processing
  await db
    .update(knowledgeDocuments)
    .set({
      chunkCount: 0,
      status: "processing",
      tokenCount: 0,
      updatedAt: new Date()
    })
    .where(eq(knowledgeDocuments.id, job.documentId));

  // Load collection config (need the collection name for bigRAG)
  const collections = await db
    .select()
    .from(knowledgeCollections)
    .where(eq(knowledgeCollections.id, job.collectionId))
    .limit(1);

  const collection = collections[0];
  if (!collection) {
    log.info("Collection no longer exists, skipping job", {
      collectionId: job.collectionId
    });
    return;
  }

  // Load document for metadata
  const documents = await db
    .select()
    .from(knowledgeDocuments)
    .where(eq(knowledgeDocuments.id, job.documentId))
    .limit(1);

  const document = documents[0];
  if (!document) {
    log.info("Document no longer exists, skipping job", {
      documentId: job.documentId
    });
    return;
  }

  // Crawl the URL
  const crawlLimit =
    typeof document.metadata?.crawlLimit === "number"
      ? document.metadata.crawlLimit
      : undefined;

  const pages: string[] = [];
  let pageCount = 0;

  for await (const page of crawlUrl(job.sourceUrl, crawlLimit)) {
    pages.push(`## ${page.url}\n\n${page.text}`);
    pageCount++;
    log.info("Crawled page", {
      documentId: job.documentId,
      page: pageCount,
      url: page.url
    });
  }

  if (pages.length === 0) {
    throw new Error("Crawl produced no content");
  }

  // Concatenate all pages into one markdown file
  const markdown = pages.join("\n\n---\n\n");
  const tempPath = join(tmpdir(), `raven-crawl-${createId()}.md`);

  try {
    await writeFile(tempPath, markdown, "utf-8");

    // Upload to bigRAG
    const bigragDoc = await bigrag.uploadDocumentFromPath(
      collection.name,
      tempPath,
      { source_url: job.sourceUrl }
    );

    // Store the bigRAG document ID and set status to processing (bigRAG processes async)
    await db
      .update(knowledgeDocuments)
      .set({
        bigragDocumentId: bigragDoc.id,
        errorMessage: null,
        lastCrawledAt: new Date(),
        status: "processing",
        updatedAt: new Date()
      })
      .where(eq(knowledgeDocuments.id, job.documentId));

    log.info("Document uploaded to bigRAG", {
      bigragDocumentId: bigragDoc.id,
      documentId: job.documentId,
      pagesCrawled: pageCount
    });
  } finally {
    // Clean up temp file
    await cleanupFile(tempPath);
  }
};

export const startWorker = (deps: WorkerDeps): (() => void) => {
  let running = true;

  const loop = async (): Promise<void> => {
    // On startup, recover any jobs stuck in the processing list from a previous crash
    try {
      await recoverStuckJobs(deps.redis);
    } catch (err) {
      log.error("Failed to recover stuck jobs", err);
    }

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
