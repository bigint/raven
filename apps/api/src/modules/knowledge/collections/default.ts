import type { BigRAG } from "@bigrag/client";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

export const getDefaultCollection =
  (bigrag: BigRAG) => async (c: AuthContext) => {
    const collection = await bigrag.getDefaultCollection();
    return success(c, collection);
  };
