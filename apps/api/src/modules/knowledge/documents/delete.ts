import type { QdrantClient } from "@qdrant/js-client-rest";
import type { Database } from "@raven/db";
import { knowledgeDocuments } from "@raven/db";
import { eq } from "drizzle-orm";
import { auditAndPublish } from "@/lib/audit";
import { NotFoundError } from "@/lib/errors";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";
import { deleteVectorsByDocumentId } from "../rag/qdrant";

export const deleteDocument =
  (db: Database, qdrant: QdrantClient) => async (c: AuthContext) => {
    const user = c.get("user");
    const docId = c.req.param("id") as string;

    const [deleted] = await db
      .delete(knowledgeDocuments)
      .where(eq(knowledgeDocuments.id, docId))
      .returning({
        collectionId: knowledgeDocuments.collectionId,
        id: knowledgeDocuments.id,
        title: knowledgeDocuments.title
      });

    if (!deleted) {
      throw new NotFoundError("Document not found");
    }

    // Fire and forget — remove Qdrant vectors in the background
    void deleteVectorsByDocumentId(qdrant, `knowledge_${deleted.collectionId}`, deleted.id);

    void auditAndPublish(db, user, "document", "deleted", {
      metadata: { title: deleted.title },
      resourceId: deleted.id
    });

    return success(c, { success: true });
  };
