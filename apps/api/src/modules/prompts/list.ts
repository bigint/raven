import type { Database } from "@raven/db";
import { prompts, promptVersions } from "@raven/db";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import { success } from "@/lib/response";

export const listPrompts = (db: Database) => async (c: Context) => {
  const orgId = c.get("orgId" as never) as string;

  const rows = await db
    .select({
      activeVersion: {
        content: promptVersions.content,
        createdAt: promptVersions.createdAt,
        id: promptVersions.id,
        isActive: promptVersions.isActive,
        model: promptVersions.model,
        promptId: promptVersions.promptId,
        version: promptVersions.version
      },
      prompt: {
        createdAt: prompts.createdAt,
        id: prompts.id,
        name: prompts.name,
        organizationId: prompts.organizationId,
        updatedAt: prompts.updatedAt
      }
    })
    .from(prompts)
    .leftJoin(
      promptVersions,
      and(
        eq(promptVersions.promptId, prompts.id),
        eq(promptVersions.isActive, true)
      )
    )
    .where(eq(prompts.organizationId, orgId));

  const result = rows.map((row) => ({
    ...row.prompt,
    activeVersion: row.activeVersion
  }));

  return success(c, result);
};
