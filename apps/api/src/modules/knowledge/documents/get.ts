import type { Database } from "@raven/db";
import { knowledgeCollections, knowledgeDocuments } from "@raven/db";
import { eq } from "drizzle-orm";
import type { BigRAG } from "@bigrag/client";
import { NotFoundError } from "@/lib/errors";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

/** GET /documents/:id — document metadata only (no chunks) */
export const getDocument = (db: Database) => async (c: AuthContext) => {
  const docId = c.req.param("id") as string;

  const [document] = await db
    .select()
    .from(knowledgeDocuments)
    .where(eq(knowledgeDocuments.id, docId))
    .limit(1);

  if (!document) {
    throw new NotFoundError("Document not found");
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
