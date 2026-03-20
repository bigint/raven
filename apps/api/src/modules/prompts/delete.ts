import type { Database } from "@raven/db";
import { prompts } from "@raven/db";
import { eq } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

export const deletePrompt = (db: Database) => async (c: AuthContext) => {
  const id = c.req.param("id") as string;

  const [existing] = await db
    .select({ id: prompts.id })
    .from(prompts)
    .where(eq(prompts.id, id))
    .limit(1);

  if (!existing) {
    throw new NotFoundError("Prompt not found");
  }

  await db
    .delete(prompts)
    .where(eq(prompts.id, id));

  return success(c, { success: true });
};
