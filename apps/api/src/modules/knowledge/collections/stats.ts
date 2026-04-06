import type { BigRAG } from "@bigrag/client";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

export const getCollectionStats =
  (bigrag: BigRAG) => async (c: AuthContext) => {
    const name = c.req.param("name") as string;
    const stats = await bigrag.getCollectionStats(name);
    return success(c, stats);
  };
