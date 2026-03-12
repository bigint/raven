import type { Database } from "@raven/db";
import { prompts, promptVersions } from "@raven/db";
import { and, eq } from "drizzle-orm";

export const resolvePrompt = async (
  db: Database,
  orgId: string,
  promptName: string,
  variables?: Record<string, string>
) => {
  const [row] = await db
    .select({
      content: promptVersions.content,
      model: promptVersions.model
    })
    .from(prompts)
    .innerJoin(
      promptVersions,
      and(
        eq(promptVersions.promptId, prompts.id),
        eq(promptVersions.isActive, true)
      )
    )
    .where(and(eq(prompts.name, promptName), eq(prompts.organizationId, orgId)))
    .limit(1);

  if (!row) {
    return null;
  }

  let content = row.content;

  if (variables) {
    for (const [key, value] of Object.entries(variables)) {
      content = content.replaceAll(`{{${key}}}`, value);
    }
  }

  return {
    content,
    model: row.model
  };
};
