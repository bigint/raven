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
    const { description, ...ravenFields } = c.req.valid("json");

    if (ravenFields.isDefault) {
      await db
        .update(knowledgeCollections)
        .set({ isDefault: false })
        .where(eq(knowledgeCollections.isDefault, true));
    }

    const hasRavenUpdates = Object.keys(filterUndefined(ravenFields as Record<string, unknown>)).length > 0;

    const [updated] = hasRavenUpdates
      ? await db
          .update(knowledgeCollections)
          .set({
            ...filterUndefined(ravenFields as Record<string, unknown>),
            updatedAt: new Date()
          })
          .where(eq(knowledgeCollections.id, id))
          .returning()
      : await db
          .select()
          .from(knowledgeCollections)
          .where(eq(knowledgeCollections.id, id))
          .limit(1);

    if (!updated) {
      throw new NotFoundError("Collection not found");
    }

    // Forward description to bigRAG
    if (description !== undefined) {
      void bigrag
        .updateCollection(updated.name, {
          description: description ?? undefined
        })
        .catch((err) => {
          log.error("Failed to update bigRAG collection", err, {
            collectionName: updated.name
          });
        });
    }

    void auditAndPublish(db, user, "collection", "updated", {
      data: updated,
      metadata: filterUndefined({ description, ...ravenFields } as Record<string, unknown>),
      resourceId: id
    });
    return success(c, updated);
  };
