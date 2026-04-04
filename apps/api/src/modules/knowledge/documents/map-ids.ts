import type { Database } from "@raven/db";
import { knowledgeDocuments } from "@raven/db";
import { inArray } from "drizzle-orm";

/**
 * Build a mapping from bigRAG document IDs to Raven document IDs
 * for a set of collections.
 */
export const buildDocumentIdMap = async (
  db: Database,
  collectionIds: string[]
): Promise<Map<string, string>> => {
  if (collectionIds.length === 0) return new Map();

  const rows = await db
    .select({
      bigragDocumentId: knowledgeDocuments.bigragDocumentId,
      id: knowledgeDocuments.id
    })
    .from(knowledgeDocuments)
    .where(inArray(knowledgeDocuments.collectionId, collectionIds));

  return new Map(
    rows
      .filter((d): d is typeof d & { bigragDocumentId: string } =>
        Boolean(d.bigragDocumentId)
      )
      .map((d) => [d.bigragDocumentId, d.id])
  );
};

/** Resolve a bigRAG document_id to a Raven document ID using the map. */
export const resolveDocumentId = (
  map: Map<string, string>,
  bigragDocumentId: string | null
): string => {
  if (!bigragDocumentId) return "";
  return map.get(bigragDocumentId) ?? bigragDocumentId;
};
