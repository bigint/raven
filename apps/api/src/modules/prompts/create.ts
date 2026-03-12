import type { Database } from "@raven/db";
import { prompts, promptVersions } from "@raven/db";
import type { Context } from "hono";
import { ValidationError } from "@/lib/errors";
import { created } from "@/lib/response";
import { createPromptSchema } from "./schema";

export const createPrompt = (db: Database) => async (c: Context) => {
  const orgId = c.get("orgId" as never) as string;
  const body = await c.req.json();
  const result = createPromptSchema.safeParse(body);

  if (!result.success) {
    throw new ValidationError("Invalid request body", {
      errors: result.error.flatten().fieldErrors
    });
  }

  const { name, content, model } = result.data;

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
