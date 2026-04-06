import type { BigRAG } from "@bigrag/client";
import type { Database } from "@raven/db";
import { auditAndPublish } from "@/lib/audit";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

export const deleteCollection =
  (db: Database, bigrag: BigRAG) => async (c: AuthContext) => {
    const user = c.get("user");
    const name = c.req.param("name") as string;

    await bigrag.deleteCollection(name);

    void auditAndPublish(db, user, "collection", "deleted", {
      resourceId: name
    });

    return success(c, { success: true });
  };
