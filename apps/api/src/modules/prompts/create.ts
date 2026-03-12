import type { Database } from "@raven/db";
import { prompts, promptVersions } from "@raven/db";
import type { Context } from "hono";
import type { z } from "zod";
import { created } from "@/lib/response";
import type { createPromptSchema } from "./schema";

export const createPrompt = (db: Database) => async (c: Context) => {
  const orgId = c.get("orgId" as never) as string;
  const { name, content, model } = c.req.valid("json" as never) as z.infer<
    typeof createPromptSchema
  >;

  const [prompt] = await db
    .insert(prompts)
    .values({
      name,
      organizationId: orgId
    })
    .returning();

  const [version] = await db
    .insert(promptVersions)
    .values({
      content,
      isActive: true,
      model: model ?? null,
      promptId: (prompt as NonNullable<typeof prompt>).id,
      version: 1
    })
    .returning();

  return created(c, {
    ...prompt,
    versions: [version]
  });
};
