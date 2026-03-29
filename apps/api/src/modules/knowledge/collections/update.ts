import type { Database } from "@raven/db";
import { knowledgeCollections } from "@raven/db";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import { auditAndPublish } from "@/lib/audit";
import { NotFoundError } from "@/lib/errors";
import { success } from "@/lib/response";
import type { AuthContextWithJson } from "@/lib/types";
import { filterUndefined } from "@/lib/utils";
import type { updateCollectionSchema } from "./schema";

type Body = z.infer<typeof updateCollectionSchema>;

export const updateCollection =
  (db: Database) => async (c: AuthContextWithJson<Body>) => {
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

    void auditAndPublish(db, user, "collection", "updated", {
      data: updated,
      metadata: filterUndefined(body as Record<string, unknown>),
      resourceId: id
    });
    return success(c, updated);
  };
