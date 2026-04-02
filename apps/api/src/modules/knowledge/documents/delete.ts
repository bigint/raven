import type { Database } from "@raven/db";
import { knowledgeCollections, knowledgeDocuments } from "@raven/db";
import { eq } from "drizzle-orm";
import { auditAndPublish } from "@/lib/audit";
import type { BigRAG } from "@bigrag/client";
import { NotFoundError } from "@/lib/errors";
import { log } from "@/lib/logger";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

export const deleteDocument =
  (db: Database, bigrag: BigRAG) => async (c: AuthContext) => {
    const user = c.get("user");
    const docId = c.req.param("id") as string;

    const [deleted] = await db
      .delete(knowledgeDocuments)
      .where(eq(knowledgeDocuments.id, docId))
      .returning({
        bigragDocumentId: knowledgeDocuments.bigragDocumentId,
        collectionId: knowledgeDocuments.collectionId,
        id: knowledgeDocuments.id,
        title: knowledgeDocuments.title
      });

    if (!deleted) {
      throw new NotFoundError("Document not found");
    }

    if (deleted.bigragDocumentId) {
      const [collection] = await db
        .select({ name: knowledgeCollections.name })
        .from(knowledgeCollections)
        .where(eq(knowledgeCollections.id, deleted.collectionId))
        .limit(1);

      if (collection) {
        // Fire and forget — remove bigRAG document in the background
        void bigrag
          .deleteDocument(collection.name, deleted.bigragDocumentId)
          .catch((err) => {
            log.error("Failed to delete bigRAG document", err, {
              bigragDocumentId: deleted.bigragDocumentId,
              collectionName: collection.name
            });
          });
      }
    }

    void auditAndPublish(db, user, "document", "deleted", {
      metadata: { title: deleted.title },
      resourceId: deleted.id
    });

    return success(c, { success: true });
  };
