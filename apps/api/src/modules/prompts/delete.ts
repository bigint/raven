import type { Database } from "@raven/db";
import { prompts } from "@raven/db";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import { NotFoundError } from "@/lib/errors";
import { success } from "@/lib/response";

export const deletePrompt = (db: Database) => async (c: Context) => {
  const orgId = c.get("orgId" as never) as string;
  const id = c.req.param("id") as string;

  const [existing] = await db
    .select({ id: prompts.id })
    .from(prompts)
    .where(and(eq(prompts.id, id), eq(prompts.organizationId, orgId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError("Prompt not found");
  }

  await db
    .delete(prompts)
    .where(and(eq(prompts.id, id), eq(prompts.organizationId, orgId)));

  return success(c, { success: true });
};
