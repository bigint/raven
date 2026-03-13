import type { Database } from "@raven/db";
import { prompts, promptVersions } from "@raven/db";
import { and, asc, eq } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";

export const getPrompt = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");
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
