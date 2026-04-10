import type { BigRAG } from "@bigrag/client";
import type { Context } from "hono";
import { success } from "@/lib/response";

export const listS3Jobs = (bigrag: BigRAG) => async (c: Context) => {
  const name = c.req.param("name") as string;
  const result = await bigrag.documents.listS3Jobs(name);
  return success(c, result);
};

export const deleteS3Job = (bigrag: BigRAG) => async (c: Context) => {
  const name = c.req.param("name") as string;
  const jobId = c.req.param("jobId") as string;
  const result = await bigrag.documents.deleteS3Job(name, jobId);
  return success(c, result);
};

export const updateS3Job = (bigrag: BigRAG) => async (c: Context) => {
  const name = c.req.param("name") as string;
  const jobId = c.req.param("jobId") as string;
  const body = await c.req.json();
  const result = await bigrag.documents.updateS3Job(name, jobId, body);
  return success(c, result);
};

export const resyncS3Job = (bigrag: BigRAG) => async (c: Context) => {
  const name = c.req.param("name") as string;
  const jobId = c.req.param("jobId") as string;
  const result = await bigrag.documents.resyncS3Job(name, jobId);
  return success(c, result);
};
