import { createId } from "@paralleldrive/cuid2";
import type { Database } from "@raven/db";
import { knowledgeCollections, knowledgeDocuments } from "@raven/db";
import { eq } from "drizzle-orm";
import type { Redis } from "ioredis";
import type { BigRAGClient } from "@/lib/bigrag";
import { NotFoundError } from "@/lib/errors";
import { log } from "@/lib/logger";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";
import { enqueueJob } from "../ingestion/queue";

export const reprocessDocument =
  (db: Database, redis: Redis, bigrag: BigRAGClient) =>
  async (c: AuthContext) => {
    const docId = c.req.param("id") as string;

    const [document] = await db
      .select()
      .from(knowledgeDocuments)
      .where(eq(knowledgeDocuments.id, docId))
      .limit(1);

    if (!document) {
      throw new NotFoundError("Document not found");
    }

    if (document.sourceType === "url") {
      // URL documents: re-enqueue crawl job via Redis
      await db
        .update(knowledgeDocuments)
        .set({ chunkCount: 0, errorMessage: null, status: "pending" })
        .where(eq(knowledgeDocuments.id, docId));

      await enqueueJob(redis, {
        collectionId: document.collectionId,
        documentId: docId,
        id: createId(),
        sourceUrl: document.sourceUrl ?? undefined,
        type: "url"
      });
    } else {
      // File/image documents: call bigRAG reprocess
      if (!document.bigragDocumentId) {
        throw new NotFoundError(
          "Document has no bigRAG reference and cannot be reprocessed"
        );
      }

      const [collection] = await db
        .select({ name: knowledgeCollections.name })
        .from(knowledgeCollections)
        .where(eq(knowledgeCollections.id, document.collectionId))
        .limit(1);

      if (!collection) {
        throw new NotFoundError("Collection not found");
      }

      await bigrag.reprocessDocument(
        collection.name,
        document.bigragDocumentId
      );

      log.info("Document reprocess requested via bigRAG", {
        bigragDocumentId: document.bigragDocumentId,
        collectionName: collection.name,
        documentId: docId
      });

      await db
        .update(knowledgeDocuments)
        .set({ chunkCount: 0, errorMessage: null, status: "processing" })
        .where(eq(knowledgeDocuments.id, docId));
    }

    return success(c, { success: true });
  };
