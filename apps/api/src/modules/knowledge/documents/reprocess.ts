import type { Database } from "@raven/db";
import { knowledgeCollections, knowledgeDocuments } from "@raven/db";
import { eq } from "drizzle-orm";
import type { BigRAGClient } from "@/lib/bigrag";
import { NotFoundError } from "@/lib/errors";
import { log } from "@/lib/logger";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

export const reprocessDocument =
  (db: Database, bigrag: BigRAGClient) => async (c: AuthContext) => {
    const docId = c.req.param("id") as string;

    const [document] = await db
      .select()
      .from(knowledgeDocuments)
      .where(eq(knowledgeDocuments.id, docId))
      .limit(1);

    if (!document) {
      throw new NotFoundError("Document not found");
    }

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

    await bigrag.reprocessDocument(collection.name, document.bigragDocumentId);

    log.info("Document reprocess requested via bigRAG", {
      bigragDocumentId: document.bigragDocumentId,
      collectionName: collection.name,
      documentId: docId
    });

    await db
      .update(knowledgeDocuments)
      .set({ chunkCount: 0, errorMessage: null, status: "processing" })
      .where(eq(knowledgeDocuments.id, docId));

    return success(c, { success: true });
  };
