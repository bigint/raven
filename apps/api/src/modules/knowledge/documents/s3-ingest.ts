import type { BigRAG } from "@bigrag/client";
import type { Database } from "@raven/db";
import type { Context } from "hono";
import { auditAndPublish } from "@/lib/audit";
import { ValidationError } from "@/lib/errors";
import { created } from "@/lib/response";

export const s3Ingest =
  (db: Database, bigrag: BigRAG) => async (c: Context) => {
    const user = c.get("user");
    const collectionName = c.req.param("name") as string;

    const body = await c.req.json<{
      bucket?: string;
      prefix?: string;
      region?: string;
      endpoint_url?: string;
      access_key?: string;
      secret_key?: string;
      file_types?: string[];
      metadata?: Record<string, unknown>;
    }>();

    if (!body.bucket || body.bucket.trim() === "") {
      throw new ValidationError("S3 bucket name is required");
    }

    const result = await bigrag.documents.ingestS3(collectionName, {
      access_key: body.access_key?.trim() || undefined,
      bucket: body.bucket.trim(),
      endpoint_url: body.endpoint_url?.trim() || undefined,
      file_types: body.file_types,
      metadata: body.metadata,
      prefix: body.prefix?.trim(),
      region: body.region?.trim() || undefined,
      secret_key: body.secret_key?.trim() || undefined
    });

    void auditAndPublish(db, user, "document", "created", {
      metadata: {
        collection: collectionName,
        s3_bucket: body.bucket,
        source: "s3"
      },
      resourceId: collectionName
    });

    return created(c, result);
  };
