import type { BigRAG } from "@bigrag/client";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

export const listCollections = (bigrag: BigRAG) => async (c: AuthContext) => {
  const name = c.req.query("name");
  const limit = c.req.query("limit");
  const offset = c.req.query("offset");

  const result = await bigrag.listCollections({
    ...(limit ? { limit: Number(limit) } : {}),
    ...(name ? { name } : {}),
    ...(offset ? { offset: Number(offset) } : {})
  });

  return success(c, result);
};
