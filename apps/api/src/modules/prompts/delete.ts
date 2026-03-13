import type { Database } from "@raven/db";
import { prompts } from "@raven/db";
import { and, eq } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";

export const deletePrompt = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");
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
