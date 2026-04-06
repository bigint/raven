import type { BigRAG } from "@bigrag/client";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

export const getCollection = (bigrag: BigRAG) => async (c: AuthContext) => {
  const name = c.req.param("name") as string;
  const collection = await bigrag.getCollection(name);
  return success(c, collection);
};
