import type { Database } from "@raven/db";
import { prompts } from "@raven/db";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import { NotFoundError } from "@/lib/errors";
import { success } from "@/lib/response";
import type { AuthContextWithJson } from "@/lib/types";
import type { updatePromptSchema } from "./schema";

type Body = z.infer<typeof updatePromptSchema>;

export const updatePrompt =
  (db: Database) => async (c: AuthContextWithJson<Body>) => {
    const id = c.req.param("id") as string;
    const data = c.req.valid("json");

    const [existing] = await db
      .select({ id: prompts.id })
      .from(prompts)
      .where(eq(prompts.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Prompt not found");
    }

    const updates: Partial<typeof prompts.$inferInsert> = {};

    if (data.name !== undefined) {
      updates.name = data.name;
    }

    updates.updatedAt = new Date();

    const [updated] = await db
      .update(prompts)
      .set(updates)
      .where(eq(prompts.id, id))
      .returning();

    return success(c, updated);
  };
