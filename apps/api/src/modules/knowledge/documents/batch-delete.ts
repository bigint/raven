import type { BigRAG } from "@bigrag/client";
import type { Database } from "@raven/db";
import type { Context } from "hono";
import { auditAndPublish } from "@/lib/audit";
import { ValidationError } from "@/lib/errors";
import { success } from "@/lib/response";

const MAX_BATCH_SIZE = 100;

export const batchDeleteDocuments =
  (db: Database, bigrag: BigRAG) => async (c: Context) => {
    const user = c.get("user");
    const collectionName = c.req.param("name") as string;

    const body = await c.req.json<{ document_ids: string[] }>();
    const documentIds = body.document_ids;

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      throw new ValidationError("document_ids must be a non-empty array");
    }

    if (documentIds.length > MAX_BATCH_SIZE) {
      throw new ValidationError(
        `Maximum ${MAX_BATCH_SIZE} documents per batch`
      );
    }

    const result = await bigrag.batchDeleteDocuments(
      collectionName,
      documentIds
    );

    for (const id of documentIds) {
      void auditAndPublish(db, user, "document", "deleted", {
        metadata: { collection: collectionName },
        resourceId: id
      });
    }

    return success(c, result);
  };
