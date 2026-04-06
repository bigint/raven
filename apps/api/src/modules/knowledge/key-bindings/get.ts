import type { Database } from "@raven/db";
import { knowledgeKeyBindings } from "@raven/db";
import { eq } from "drizzle-orm";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

export const getKeyBindings = (db: Database) => async (c: AuthContext) => {
  const id = c.req.param("id") as string;

  const bindings = await db
    .select({
      collectionName: knowledgeKeyBindings.collectionName,
      createdAt: knowledgeKeyBindings.createdAt,
      id: knowledgeKeyBindings.id,
      ragEnabled: knowledgeKeyBindings.ragEnabled,
      virtualKeyId: knowledgeKeyBindings.virtualKeyId
    })
    .from(knowledgeKeyBindings)
    .where(eq(knowledgeKeyBindings.virtualKeyId, id));

  return success(c, bindings);
};
