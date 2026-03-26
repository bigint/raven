import type { Database } from "@raven/db";
import { knowledgeKeyBindings } from "@raven/db";
import { eq } from "drizzle-orm";
import { success } from "@/lib/response";
import type { AuthContextWithJson } from "@/lib/types";
import type { z } from "zod";
import type { updateKeyBindingsSchema } from "./schema";

type UpdateKeyBindingsInput = z.infer<typeof updateKeyBindingsSchema>;

export const updateKeyBindings =
  (db: Database) =>
  async (c: AuthContextWithJson<UpdateKeyBindingsInput>) => {
    const id = c.req.param("id") as string;
    const bindings = c.req.valid("json");

    await db
      .delete(knowledgeKeyBindings)
      .where(eq(knowledgeKeyBindings.virtualKeyId, id));

    const inserted =
      bindings.length > 0
        ? await db
            .insert(knowledgeKeyBindings)
            .values(
              bindings.map((b) => ({
                collectionId: b.collectionId,
                ragEnabled: b.ragEnabled,
                virtualKeyId: id
              }))
            )
            .returning()
        : [];

    return success(c, inserted);
  };
