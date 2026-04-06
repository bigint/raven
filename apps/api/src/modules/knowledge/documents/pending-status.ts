import type { BigRAG } from "@bigrag/client";
import type { Database } from "@raven/db";
import { knowledgeCollections, knowledgeDocuments } from "@raven/db";
import { and, eq, inArray } from "drizzle-orm";
import type { Context } from "hono";
import { NotFoundError } from "@/lib/errors";
import { success } from "@/lib/response";

export const getPendingStatus =
  (db: Database, bigrag: BigRAG) => async (c: Context) => {
    const collectionId = c.req.param("id") as string;

    const docs = await db
      .select({
        bigragDocumentId: knowledgeDocuments.bigragDocumentId,
        chunkCount: knowledgeDocuments.chunkCount,
        errorMessage: knowledgeDocuments.errorMessage,
        id: knowledgeDocuments.id,
        status: knowledgeDocuments.status
      })
      .from(knowledgeDocuments)
      .where(
        and(
          eq(knowledgeDocuments.collectionId, collectionId),
          inArray(knowledgeDocuments.status, ["pending", "processing"])
        )
      );

    if (docs.length === 0) {
      return success(c, { documents: [], total: 0 });
    }

    const [collection] = await db
      .select({ name: knowledgeCollections.name })
      .from(knowledgeCollections)
      .where(eq(knowledgeCollections.id, collectionId))
      .limit(1);

    if (!collection) {
      throw new NotFoundError("Collection not found");
    }

    const syncable = docs.filter((d) => d.bigragDocumentId);

    if (syncable.length > 0) {
      try {
        const statusResult = await bigrag.batchGetStatus(
          collection.name,
          syncable.map((d) => d.bigragDocumentId!)
        );

        const statusMap = new Map(statusResult.documents.map((d) => [d.id, d]));

        for (const doc of syncable) {
          const remote = statusMap.get(doc.bigragDocumentId!);
          if (!remote) continue;

          if (remote.status === "ready") {
            await db
              .update(knowledgeDocuments)
              .set({
                chunkCount: remote.chunk_count ?? 0,
                errorMessage: null,
                status: "ready",
                updatedAt: new Date()
              })
              .where(eq(knowledgeDocuments.id, doc.id));
            doc.status = "ready";
            doc.chunkCount = remote.chunk_count ?? 0;
            doc.errorMessage = null;
          } else if (remote.status === "failed") {
            await db
              .update(knowledgeDocuments)
              .set({
                errorMessage:
                  remote.error_message ?? "Processing failed in bigRAG",
                status: "failed",
                updatedAt: new Date()
              })
              .where(eq(knowledgeDocuments.id, doc.id));
            doc.status = "failed";
            doc.errorMessage =
              remote.error_message ?? "Processing failed in bigRAG";
          }
        }
      } catch {
        // If batch status call fails, return current DB state
      }
    }

    return success(c, {
      documents: docs.map((d) => ({
        chunkCount: d.chunkCount,
        errorMessage: d.errorMessage,
        id: d.id,
        status: d.status
      })),
      total: docs.length
    });
  };
