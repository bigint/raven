import type { BigRAG } from "@bigrag/client";
import type { Database } from "@raven/db";
import { knowledgeCollections, knowledgeDocuments } from "@raven/db";
import { eq } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

/** GET /documents/:id — document metadata only (no chunks) */
export const getDocument =
  (db: Database, bigrag: BigRAG) => async (c: AuthContext) => {
    const docId = c.req.param("id") as string;

    const [document] = await db
      .select()
      .from(knowledgeDocuments)
      .where(eq(knowledgeDocuments.id, docId))
      .limit(1);

    if (!document) {
      throw new NotFoundError("Document not found");
    }

    // Inline status sync: fetch fresh status from bigRAG for in-progress docs
    if (
      (document.status === "pending" || document.status === "processing") &&
      document.bigragDocumentId
    ) {
      const [collection] = await db
        .select({ name: knowledgeCollections.name })
        .from(knowledgeCollections)
        .where(eq(knowledgeCollections.id, document.collectionId))
        .limit(1);

      if (collection) {
        try {
          const bigragDoc = await bigrag.getDocument(
            collection.name,
            document.bigragDocumentId
          );

          if (bigragDoc.status === "ready") {
            const updates = {
              chunkCount: bigragDoc.chunk_count,
              errorMessage: null,
              status: "ready" as const,
              updatedAt: new Date()
            };
            await db
              .update(knowledgeDocuments)
              .set(updates)
              .where(eq(knowledgeDocuments.id, docId));

            return success(c, { ...document, ...updates });
          }

          if (bigragDoc.status === "failed") {
            const updates = {
              errorMessage:
                bigragDoc.error_message ?? "Processing failed in bigRAG",
              status: "failed" as const,
              updatedAt: new Date()
            };
            await db
              .update(knowledgeDocuments)
              .set(updates)
              .where(eq(knowledgeDocuments.id, docId));

            return success(c, { ...document, ...updates });
          }
        } catch {
          // On error, return cached status
        }
      }
    }

    return success(c, document);
  };

/** GET /documents/:id/chunks?limit=20&offset=0 — paginated chunks */
export const getDocumentChunks =
  (db: Database, bigrag: BigRAG) => async (c: AuthContext) => {
    const docId = c.req.param("id") as string;
    const limit = Math.min(Number(c.req.query("limit") ?? "20"), 100);
    const offset = Number(c.req.query("offset") ?? "0");

    const [document] = await db
      .select({
        bigragDocumentId: knowledgeDocuments.bigragDocumentId,
        collectionId: knowledgeDocuments.collectionId
      })
      .from(knowledgeDocuments)
      .where(eq(knowledgeDocuments.id, docId))
      .limit(1);

    if (!document) {
      throw new NotFoundError("Document not found");
    }

    if (!document.bigragDocumentId) {
      return success(c, { chunks: [], total: 0 });
    }

    const [collection] = await db
      .select({ name: knowledgeCollections.name })
      .from(knowledgeCollections)
      .where(eq(knowledgeCollections.id, document.collectionId))
      .limit(1);

    if (!collection) {
      throw new NotFoundError("Collection not found");
    }

    const result = await bigrag.getDocumentChunks(
      collection.name,
      document.bigragDocumentId
    );

    const mapped = result.chunks.map((chunk) => ({
      chunkIndex: chunk.chunk_index,
      content: chunk.text,
      documentId: docId,
      id: chunk.id,
      metadata: chunk.metadata
    }));

    const paginated = mapped.slice(offset, offset + limit);

    return success(c, { chunks: paginated, total: result.total });
  };
