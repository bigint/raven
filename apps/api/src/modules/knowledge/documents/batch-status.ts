import type { BigRAG } from "@bigrag/client";
import type { Database } from "@raven/db";
import { knowledgeCollections, knowledgeDocuments } from "@raven/db";
import { eq, inArray } from "drizzle-orm";
import type { Context } from "hono";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { success } from "@/lib/response";

const MAX_BATCH_SIZE = 100;

export const batchGetDocumentStatus =
  (db: Database, bigrag: BigRAG) => async (c: Context) => {
    const collectionId = c.req.param("id") as string;

    const body = await c.req.json<{ document_ids: string[] }>();
    const documentIds = body.document_ids;

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      throw new ValidationError("document_ids must be a non-empty array");
    }

    if (documentIds.length > MAX_BATCH_SIZE) {
      throw new ValidationError(
        `Maximum ${MAX_BATCH_SIZE} documents per batch`
      );
    }

    const [collection] = await db
      .select({ name: knowledgeCollections.name })
      .from(knowledgeCollections)
      .where(eq(knowledgeCollections.id, collectionId))
      .limit(1);

    if (!collection) {
      throw new NotFoundError("Collection not found");
    }

    const docs = await db
      .select()
      .from(knowledgeDocuments)
      .where(inArray(knowledgeDocuments.id, documentIds));

    const pendingDocs = docs.filter(
      (d) =>
        (d.status === "pending" || d.status === "processing") &&
        d.bigragDocumentId
    );

    if (pendingDocs.length > 0) {
      try {
        const statusResult = await bigrag.batchGetStatus(
          collection.name,
          pendingDocs.map((d) => d.bigragDocumentId!)
        );

        const statusMap = new Map(statusResult.documents.map((d) => [d.id, d]));

        for (const doc of pendingDocs) {
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
