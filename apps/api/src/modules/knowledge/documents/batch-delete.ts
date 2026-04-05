import type { BigRAG } from "@bigrag/client";
import type { Database } from "@raven/db";
import { knowledgeCollections, knowledgeDocuments } from "@raven/db";
import { eq, inArray } from "drizzle-orm";
import { auditAndPublish } from "@/lib/audit";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { log } from "@/lib/logger";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

const MAX_BATCH_SIZE = 100;

export const batchDeleteDocuments =
  (db: Database, bigrag: BigRAG) => async (c: AuthContext) => {
    const user = c.get("user");
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

    const deleted = await db
      .delete(knowledgeDocuments)
      .where(inArray(knowledgeDocuments.id, documentIds))
      .returning({
        bigragDocumentId: knowledgeDocuments.bigragDocumentId,
        id: knowledgeDocuments.id,
        title: knowledgeDocuments.title
      });

    const bigragIds = deleted
      .map((d) => d.bigragDocumentId)
      .filter((id): id is string => id !== null);

    if (bigragIds.length > 0) {
      void bigrag
        .batchDeleteDocuments(collection.name, bigragIds)
        .catch((err) => {
          log.error("Failed to batch delete bigRAG documents", err, {
            collectionName: collection.name,
            count: bigragIds.length
          });
        });
    }

    for (const doc of deleted) {
      void auditAndPublish(db, user, "document", "deleted", {
        metadata: { title: doc.title },
        resourceId: doc.id
      });
    }

    const deletedIds = new Set(deleted.map((d) => d.id));
    const errors = documentIds
      .filter((id) => !deletedIds.has(id))
      .map((id) => ({ document_id: id, error: "Document not found" }));

    return success(c, { deleted: deleted.length, errors });
  };
