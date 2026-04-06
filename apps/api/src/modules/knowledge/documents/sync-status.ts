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
        errorMessage: bigragDoc.error_message ?? "Processing failed in bigRAG",
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

/**
 * Batch-sync status for multiple pending/processing documents in a single
 * bigRAG call. Returns a map of document ID → patch for documents that
 * have transitioned to ready/failed.
 */
export const syncDocumentStatusBatch = async (
  db: Database,
  bigrag: BigRAG,
  docs: DocumentRow[],
  collectionName: string
): Promise<Map<string, StatusPatch>> => {
  const pendingDocs = docs.filter(
    (d) =>
      (d.status === "pending" || d.status === "processing") &&
      d.bigragDocumentId
  );

  const updateMap = new Map<string, StatusPatch>();
  if (pendingDocs.length === 0) return updateMap;

  try {
    const statusResult = await bigrag.batchGetStatus(
      collectionName,
      pendingDocs.map((d) => d.bigragDocumentId!)
    );

    const remoteMap = new Map(statusResult.documents.map((d) => [d.id, d]));

    for (const doc of pendingDocs) {
      const remote = remoteMap.get(doc.bigragDocumentId!);
      if (!remote) continue;

      let patch: StatusPatch | null = null;

      if (remote.status === "ready") {
        patch = {
          chunkCount: remote.chunk_count ?? 0,
          errorMessage: null,
          status: "ready",
          updatedAt: new Date()
        };
      } else if (remote.status === "failed") {
        patch = {
          errorMessage: remote.error_message ?? "Processing failed in bigRAG",
          status: "failed",
          updatedAt: new Date()
        };
      }

      if (patch) {
        await db
          .update(knowledgeDocuments)
          .set(patch)
          .where(eq(knowledgeDocuments.id, doc.id));
        updateMap.set(doc.id, patch);
      }
    }
  } catch {
    // If batch status call fails, return empty map (use stale DB state)
  }

  return updateMap;
};
