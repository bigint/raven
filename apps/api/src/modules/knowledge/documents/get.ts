import type { BigRAG } from "@bigrag/client";
import type { Context } from "hono";
import { success } from "@/lib/response";

export const getDocument = (bigrag: BigRAG) => async (c: Context) => {
  const collectionName = c.req.param("name") as string;
  const docId = c.req.param("docId") as string;

  const document = await bigrag.getDocument(collectionName, docId);
  return success(c, document);
};

export const getDocumentChunks = (bigrag: BigRAG) => async (c: Context) => {
  const collectionName = c.req.param("name") as string;
  const docId = c.req.param("docId") as string;

  const result = await bigrag.getDocumentChunks(collectionName, docId);
  return success(c, result);
};
