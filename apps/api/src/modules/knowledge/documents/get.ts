import type { BigRAG } from "@bigrag/client";
import type { Context } from "hono";
import { success } from "@/lib/response";

export const getDocument = (bigrag: BigRAG) => async (c: Context) => {
  const docId = c.req.param("docId") as string;

  const document = await bigrag._request(
    "GET",
    `/v1/documents/${encodeURIComponent(docId)}`
  );
  return success(c, document);
};

export const getDocumentChunks = (bigrag: BigRAG) => async (c: Context) => {
  const docId = c.req.param("docId") as string;

  const result = await bigrag._request(
    "GET",
    `/v1/documents/${encodeURIComponent(docId)}/chunks`
  );
  return success(c, result);
};
