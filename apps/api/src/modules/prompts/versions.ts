import type { Database } from "@raven/db";
import { prompts, promptVersions } from "@raven/db";
import { and, desc, eq } from "drizzle-orm";
import type { z } from "zod";
import { NotFoundError } from "@/lib/errors";
import { created, success } from "@/lib/response";
import type { AppContext, AppContextWithJson } from "@/lib/types";
import type { createVersionSchema } from "./schema";

const findPrompt = async (db: Database, id: string, orgId: string) => {
  const [prompt] = await db
    .select({ id: prompts.id })
    .from(prompts)
    .where(and(eq(prompts.id, id), eq(prompts.organizationId, orgId)))
    .limit(1);

  if (!prompt) {
    throw new NotFoundError("Prompt not found");
  }

  return prompt;
};

type Body = z.infer<typeof createVersionSchema>;

export const createVersion =
  (db: Database) => async (c: AppContextWithJson<Body>) => {
    const orgId = c.get("orgId");
    const id = c.req.param("id") as string;
    const { content, model } = c.req.valid("json");

    await findPrompt(db, id, orgId);

    // Get latest version number
    const [latest] = await db
      .select({ version: promptVersions.version })
      .from(promptVersions)
      .where(eq(promptVersions.promptId, id))
      .orderBy(desc(promptVersions.version))
      .limit(1);

    const nextVersion = latest ? latest.version + 1 : 1;

    // Deactivate all existing versions
    await db
      .update(promptVersions)
      .set({ isActive: false })
      .where(eq(promptVersions.promptId, id));

    // Create new active version
    const [version] = await db
      .insert(promptVersions)
      .values({
        content,
        isActive: true,
        model: model ?? null,
        promptId: id,
        version: nextVersion
      })
      .returning();

    return created(c, version);
  };

export const activateVersion = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id") as string;
  const versionId = c.req.param("versionId") as string;

  await findPrompt(db, id, orgId);

  const [version] = await db
    .select({ id: promptVersions.id })
    .from(promptVersions)
    .where(
      and(eq(promptVersions.id, versionId), eq(promptVersions.promptId, id))
    )
    .limit(1);

  if (!version) {
    throw new NotFoundError("Prompt version not found");
  }

  // Deactivate all versions for this prompt
  await db
    .update(promptVersions)
    .set({ isActive: false })
    .where(eq(promptVersions.promptId, id));

  // Activate the specified version
  const [activated] = await db
    .update(promptVersions)
    .set({ isActive: true })
    .where(eq(promptVersions.id, versionId))
    .returning();

  return success(c, activated);
};
