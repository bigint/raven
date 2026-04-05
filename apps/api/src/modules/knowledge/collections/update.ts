import type { BigRAG } from "@bigrag/client";
import type { Database } from "@raven/db";
import { knowledgeCollections } from "@raven/db";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import { auditAndPublish } from "@/lib/audit";
import { NotFoundError } from "@/lib/errors";
import { log } from "@/lib/logger";
import { success } from "@/lib/response";
import type { AuthContextWithJson } from "@/lib/types";
import { filterUndefined } from "@/lib/utils";
import type { updateCollectionSchema } from "./schema";

type Body = z.infer<typeof updateCollectionSchema>;

export const updateCollection =
  (db: Database, bigrag: BigRAG) => async (c: AuthContextWithJson<Body>) => {
    const user = c.get("user");
    const id = c.req.param("id") as string;
    const body = c.req.valid("json");

    if (body.isDefault) {
      await db
        .update(knowledgeCollections)
        .set({ isDefault: false })
        .where(eq(knowledgeCollections.isDefault, true));
    }

    const [updated] = await db
      .update(knowledgeCollections)
      .set({
        ...filterUndefined(body as Record<string, unknown>),
        updatedAt: new Date()
      })
      .where(eq(knowledgeCollections.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundError("Collection not found");
    }

    // Sync query defaults to bigRAG if topK or similarityThreshold changed
    if (body.topK !== undefined || body.similarityThreshold !== undefined) {
      void bigrag
        .updateCollection(updated.name, {
          ...(body.topK !== undefined
            ? { default_top_k: updated.topK }
            : {}),
          ...(body.similarityThreshold !== undefined
            ? { default_min_score: updated.similarityThreshold }
            : {})
        })
        .catch((err) => {
          log.error("Failed to sync collection defaults to bigRAG", err, {
            collectionName: updated.name
          });
        });
    }

    void auditAndPublish(db, user, "collection", "updated", {
      data: updated,
      metadata: filterUndefined(body as Record<string, unknown>),
      resourceId: id
    });
    return success(c, updated);
  };
