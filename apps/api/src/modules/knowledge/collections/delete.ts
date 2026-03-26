import type { QdrantClient } from "@qdrant/js-client-rest";
import type { Database } from "@raven/db";
import { knowledgeCollections } from "@raven/db";
import { eq } from "drizzle-orm";
import { auditAndPublish } from "@/lib/audit";
import { NotFoundError } from "@/lib/errors";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";
import { deleteCollection as deleteQdrantCollection } from "../rag/qdrant";

export const deleteCollection =
  (db: Database, qdrant: QdrantClient) => async (c: AuthContext) => {
    const user = c.get("user");
    const id = c.req.param("id") as string;

    const [deleted] = await db
      .delete(knowledgeCollections)
      .where(eq(knowledgeCollections.id, id))
      .returning({
        id: knowledgeCollections.id,
        name: knowledgeCollections.name
      });

    if (!deleted) {
      throw new NotFoundError("Collection not found");
    }

    // Fire and forget — remove Qdrant collection in the background
    void deleteQdrantCollection(qdrant, deleted.id);

    void auditAndPublish(db, user, "collection", "deleted", { resourceId: id });
    return success(c, { success: true });
  };
