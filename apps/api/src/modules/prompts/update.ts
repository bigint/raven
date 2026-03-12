import type { Database } from "@raven/db";
import { prompts } from "@raven/db";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import type { z } from "zod";
import { NotFoundError } from "@/lib/errors";
import { success } from "@/lib/response";
import type { updatePromptSchema } from "./schema";

export const updatePrompt = (db: Database) => async (c: Context) => {
  const orgId = c.get("orgId" as never) as string;
  const id = c.req.param("id") as string;
  const data = c.req.valid("json" as never) as z.infer<
    typeof updatePromptSchema
  >;

  const [existing] = await db
    .select({ id: prompts.id })
    .from(prompts)
    .where(and(eq(prompts.id, id), eq(prompts.organizationId, orgId)))
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
    .where(and(eq(prompts.id, id), eq(prompts.organizationId, orgId)))
    .returning();

  return success(c, updated);
};
