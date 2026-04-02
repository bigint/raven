import type { BigRAG } from "@bigrag/client";
import type { Database } from "@raven/db";
import { knowledgeCollections } from "@raven/db";
import { eq } from "drizzle-orm";
import { auditAndPublish } from "@/lib/audit";
import { NotFoundError } from "@/lib/errors";
import { log } from "@/lib/logger";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

export const deleteCollection =
  (db: Database, bigrag: BigRAG) => async (c: AuthContext) => {
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

    // Fire and forget — remove bigRAG collection in the background
    void bigrag.deleteCollection(deleted.name).catch((err) => {
      log.error("Failed to delete bigRAG collection", err, {
        collectionId: deleted.id,
        name: deleted.name
      });
    });

    void auditAndPublish(db, user, "collection", "deleted", { resourceId: id });
    return success(c, { success: true });
  };
