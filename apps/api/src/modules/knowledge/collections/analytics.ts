import type { BigRAG } from "@bigrag/client";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

export const getCollectionAnalytics =
  (bigrag: BigRAG) => async (c: AuthContext) => {
    const name = c.req.param("name") as string;
    const result = await bigrag.getAnalytics(name);
    return success(c, result);
  };
