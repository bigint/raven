import type { BigRAG } from "@bigrag/client";
import type { Database } from "@raven/db";
import { knowledgeCollections, knowledgeDocuments } from "@raven/db";
import { and, eq, inArray, isNotNull } from "drizzle-orm";

export const syncDocumentStatuses = async (
  db: Database,
  bigrag: BigRAG
): Promise<void> => {
  // Find documents that are still pending/processing and have a bigRAG document ID
  const docs = await db
    .select({
      bigragDocumentId: knowledgeDocuments.bigragDocumentId,
      collectionId: knowledgeDocuments.collectionId,
      id: knowledgeDocuments.id
    })
    .from(knowledgeDocuments)
    .where(
      and(
        inArray(knowledgeDocuments.status, ["pending", "processing"]),
        isNotNull(knowledgeDocuments.bigragDocumentId)
      )
    );

  if (docs.length === 0) {
    return;
  }

  console.log(`Status sync: checking ${docs.length} document(s)`);

  // Collect unique collection IDs and look up their names
  const collectionIds = [...new Set(docs.map((d) => d.collectionId))];
  const collections = await db
    .select({ id: knowledgeCollections.id, name: knowledgeCollections.name })
    .from(knowledgeCollections)
    .where(inArray(knowledgeCollections.id, collectionIds));

  const collectionNameMap = new Map(collections.map((c) => [c.id, c.name]));

  for (const doc of docs) {
    const collectionName = collectionNameMap.get(doc.collectionId);
    if (!collectionName || !doc.bigragDocumentId) {
      continue;
    }

    try {
      const bigragDoc = await bigrag.getDocument(
        collectionName,
        doc.bigragDocumentId
      );

      if (bigragDoc.status === "ready") {
        await db
          .update(knowledgeDocuments)
          .set({
            chunkCount: bigragDoc.chunk_count,
            errorMessage: null,
            status: "ready",
            updatedAt: new Date()
          })
          .where(eq(knowledgeDocuments.id, doc.id));

        console.log(
          `Status sync: document ${doc.id} is ready (${bigragDoc.chunk_count} chunks)`
        );
      } else if (bigragDoc.status === "failed") {
        await db
          .update(knowledgeDocuments)
          .set({
            errorMessage:
              bigragDoc.error_message ?? "Processing failed in bigRAG",
            status: "failed",
            updatedAt: new Date()
          })
          .where(eq(knowledgeDocuments.id, doc.id));

        console.log(
          `Status sync: document ${doc.id} failed: ${bigragDoc.error_message}`
        );
      }
      // If still pending/processing in bigRAG, skip — will retry next cycle
    } catch (err) {
      // Skip on any error — will retry next cycle
      console.error(
        `Status sync: error checking document ${doc.id}:`,
        err instanceof Error ? err.message : String(err)
      );
    }
  }
};
