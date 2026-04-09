import type { BigRAG } from "@bigrag/client";
import type { Context } from "hono";
import { success } from "@/lib/response";

export const getDocument = (bigrag: BigRAG) => async (c: Context) => {
  const docId = c.req.param("docId") as string;
  const document = await bigrag.documents.getById(docId);
  return success(c, document);
};

export const getDocumentChunks = (bigrag: BigRAG) => async (c: Context) => {
  const docId = c.req.param("docId") as string;
  const result = await bigrag.documents.getChunksById(docId);
  return success(c, result);
};
