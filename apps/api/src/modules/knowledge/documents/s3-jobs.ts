import type { BigRAG } from "@bigrag/client";
import type { Context } from "hono";
import { success } from "@/lib/response";

export const listS3Jobs = (bigrag: BigRAG) => async (c: Context) => {
  const collectionName = c.req.param("name") as string;
  const result = await bigrag._request(
    "GET",
    `/v1/collections/${encodeURIComponent(collectionName)}/s3-jobs`
  );
  return success(c, result);
};

export const deleteS3Job = (bigrag: BigRAG) => async (c: Context) => {
  const collectionName = c.req.param("name") as string;
  const jobId = c.req.param("jobId") as string;
  const result = await bigrag._request(
    "DELETE",
    `/v1/collections/${encodeURIComponent(collectionName)}/s3-jobs/${encodeURIComponent(jobId)}`
  );
  return success(c, result);
};

export const resyncS3Job = (bigrag: BigRAG) => async (c: Context) => {
  const collectionName = c.req.param("name") as string;
  const jobId = c.req.param("jobId") as string;
  const result = await bigrag._request(
    "POST",
    `/v1/collections/${encodeURIComponent(collectionName)}/s3-jobs/${encodeURIComponent(jobId)}/resync`
  );
  return success(c, result);
};
