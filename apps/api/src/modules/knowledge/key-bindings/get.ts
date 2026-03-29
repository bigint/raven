import type { Database } from "@raven/db";
import { knowledgeCollections, knowledgeKeyBindings } from "@raven/db";
import { eq } from "drizzle-orm";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

export const getKeyBindings = (db: Database) => async (c: AuthContext) => {
  const id = c.req.param("id") as string;

  const bindings = await db
    .select({
      collectionId: knowledgeKeyBindings.collectionId,
      collectionName: knowledgeCollections.name,
      createdAt: knowledgeKeyBindings.createdAt,
      id: knowledgeKeyBindings.id,
      ragEnabled: knowledgeKeyBindings.ragEnabled,
      virtualKeyId: knowledgeKeyBindings.virtualKeyId
    })
    .from(knowledgeKeyBindings)
    .innerJoin(
      knowledgeCollections,
      eq(knowledgeCollections.id, knowledgeKeyBindings.collectionId)
    )
    .where(eq(knowledgeKeyBindings.virtualKeyId, id));

  return success(c, bindings);
};
