import type { BigRAG } from "@bigrag/client";
import type { Database } from "@raven/db";
import type { Context } from "hono";
import { auditAndPublish } from "@/lib/audit";
import { success } from "@/lib/response";

export const deleteDocument =
  (db: Database, bigrag: BigRAG) => async (c: Context) => {
    const user = c.get("user");
    const collectionName = c.req.param("name") as string;
    const docId = c.req.param("docId") as string;

    await bigrag.deleteDocument(collectionName, docId);

    void auditAndPublish(db, user, "document", "deleted", {
      metadata: { collection: collectionName },
      resourceId: docId
    });

    return success(c, { success: true });
  };
