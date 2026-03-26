import { createId } from "@paralleldrive/cuid2";
import type { QdrantClient } from "@qdrant/js-client-rest";
import type { Database } from "@raven/db";
import { knowledgeChunks, knowledgeDocuments } from "@raven/db";
import { eq } from "drizzle-orm";
import type { Redis } from "ioredis";
import { NotFoundError } from "@/lib/errors";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";
import { enqueueJob } from "../ingestion/queue";
import { deleteVectorsByDocumentId } from "../rag/qdrant";

export const reprocessDocument =
  (db: Database, redis: Redis, qdrant: QdrantClient) =>
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

    // Delete existing chunks from Postgres
    await db
      .delete(knowledgeChunks)
      .where(eq(knowledgeChunks.documentId, docId));

    // Delete vectors from Qdrant
    void deleteVectorsByDocumentId(
      qdrant,
      `knowledge_${document.collectionId}`,
      docId
    );

    // Reset document status to pending
    await db
      .update(knowledgeDocuments)
      .set({ chunkCount: 0, errorMessage: null, status: "pending" })
      .where(eq(knowledgeDocuments.id, docId));

    // Re-enqueue ingestion job
    await enqueueJob(redis, {
      collectionId: document.collectionId,
      documentId: docId,
      filePath: undefined,
      id: createId(),
      sourceUrl: document.sourceUrl ?? undefined,
      type: document.sourceType
    });

    return success(c, { success: true });
  };
