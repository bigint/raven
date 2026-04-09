import type { BigRAG } from "@bigrag/client";
import type { Database } from "@raven/db";
import { auditAndPublish } from "@/lib/audit";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

export const truncateCollection =
  (db: Database, bigrag: BigRAG) => async (c: AuthContext) => {
    const user = c.get("user");
    const name = c.req.param("name") as string;

    const result = await bigrag._request(
      "POST",
      `/v1/collections/${encodeURIComponent(name)}/truncate`
    );

    void auditAndPublish(db, user, "collection", "truncated", {
      resourceId: name
    });

    return success(c, result);
  };
