import type { BigRAG } from "@bigrag/client";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

export const listCollections = (bigrag: BigRAG) => async (c: AuthContext) => {
  const result = await bigrag.listCollections();
  return success(c, result.collections);
};
