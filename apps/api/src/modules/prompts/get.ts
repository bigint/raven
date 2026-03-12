import type { Database } from "@raven/db";
import { prompts, promptVersions } from "@raven/db";
import { and, asc, eq } from "drizzle-orm";
import type { Context } from "hono";
import { NotFoundError } from "@/lib/errors";
import { success } from "@/lib/response";

export const getPrompt = (db: Database) => async (c: Context) => {
  const orgId = c.get("orgId" as never) as string;
  const id = c.req.param("id") as string;

  const [prompt] = await db
    .select()
    .from(prompts)
    .where(and(eq(prompts.id, id), eq(prompts.organizationId, orgId)))
    .limit(1);

  if (!prompt) {
    throw new NotFoundError("Prompt not found");
  }

  const versions = await db
    .select()
    .from(promptVersions)
    .where(eq(promptVersions.promptId, id))
    .orderBy(asc(promptVersions.version));

  return success(c, { ...prompt, versions });
};
