import type { BigRAG } from "@bigrag/client";
import type { Context } from "hono";
import { success } from "@/lib/response";

export const listDocuments = (bigrag: BigRAG) => async (c: Context) => {
  const collectionName = c.req.param("name") as string;
  const limit = Number(c.req.query("limit") ?? "50");
  const offset = Number(c.req.query("offset") ?? "0");

  const result = await bigrag.listDocuments(collectionName, { limit, offset });
  return success(c, result);
};
