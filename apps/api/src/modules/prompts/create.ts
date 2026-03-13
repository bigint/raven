import type { Database } from "@raven/db";
import { prompts, promptVersions } from "@raven/db";
import type { z } from "zod";
import { created } from "@/lib/response";
import type { AppContextWithJson } from "@/lib/types";
import type { createPromptSchema } from "./schema";

type Body = z.infer<typeof createPromptSchema>;

export const createPrompt =
  (db: Database) => async (c: AppContextWithJson<Body>) => {
    const orgId = c.get("orgId");
    const { name, content, model } = c.req.valid("json");

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
