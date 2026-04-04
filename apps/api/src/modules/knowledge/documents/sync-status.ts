import type { BigRAG } from "@bigrag/client";
import type { Database } from "@raven/db";
import { knowledgeCollections, knowledgeDocuments } from "@raven/db";
import { eq } from "drizzle-orm";

type DocumentRow = typeof knowledgeDocuments.$inferSelect;

interface StatusPatch {
  chunkCount?: number;
  errorMessage: string | null;
  status: "failed" | "ready";
  updatedAt: Date;
}

/**
 * Fetch fresh status from bigRAG for a pending/processing document.
 * If the document has transitioned to ready/failed, update the DB and
 * return the patched fields. Returns null if no update was needed.
 */
export const syncDocumentStatus = async (
  db: Database,
  bigrag: BigRAG,
  doc: DocumentRow
): Promise<StatusPatch | null> => {
  if (
    (doc.status !== "pending" && doc.status !== "processing") ||
    !doc.bigragDocumentId
  ) {
    return null;
  }

  const [collection] = await db
    .select({ name: knowledgeCollections.name })
    .from(knowledgeCollections)
    .where(eq(knowledgeCollections.id, doc.collectionId))
    .limit(1);

  if (!collection) return null;

  try {
    const bigragDoc = await bigrag.getDocument(
      collection.name,
      doc.bigragDocumentId
    );

    let patch: StatusPatch | null = null;

    if (bigragDoc.status === "ready") {
      patch = {
        chunkCount: bigragDoc.chunk_count,
        errorMessage: null,
        status: "ready",
        updatedAt: new Date()
      };
    } else if (bigragDoc.status === "failed") {
      patch = {
        errorMessage:
          bigragDoc.error_message ?? "Processing failed in bigRAG",
        status: "failed",
        updatedAt: new Date()
      };
    }

    if (patch) {
      await db
        .update(knowledgeDocuments)
        .set(patch)
        .where(eq(knowledgeDocuments.id, doc.id));
    }

    return patch;
  } catch {
    return null;
  }
};
