import type { BigRAG } from "@bigrag/client";
import type { Context } from "hono";
import { success } from "@/lib/response";

export const reprocessDocument = (bigrag: BigRAG) => async (c: Context) => {
  const collectionName = c.req.param("name") as string;
  const docId = c.req.param("docId") as string;

  await bigrag.reprocessDocument(collectionName, docId);
  return success(c, { success: true });
};
