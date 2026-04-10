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
  const limit = Number(c.req.query("limit") ?? 50);
  const offset = Number(c.req.query("offset") ?? 0);
  const result = await bigrag.documents.getChunksById(docId, { limit, offset });
  return success(c, result);
};
