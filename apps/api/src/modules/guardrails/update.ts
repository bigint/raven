import type { Database } from "@raven/db";
import { guardrailRules } from "@raven/db";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import { auditAndPublish } from "@/lib/audit";
import { NotFoundError } from "@/lib/errors";
import { success } from "@/lib/response";
import type { AuthContextWithJson } from "@/lib/types";
import { filterUndefined } from "@/lib/utils";
import type { updateGuardrailSchema } from "./schema";

type Body = z.infer<typeof updateGuardrailSchema>;

export const updateGuardrail =
  (db: Database) => async (c: AuthContextWithJson<Body>) => {
    const user = c.get("user");
    const id = c.req.param("id") as string;
    const { name, type, config, action, isEnabled, priority } =
      c.req.valid("json");

    const [updated] = await db
      .update(guardrailRules)
      .set(filterUndefined({ action, config, isEnabled, name, priority, type }))
      .where(eq(guardrailRules.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundError("Guardrail rule not found");
    }

    void auditAndPublish(db, user, "guardrail", "updated", {
      data: updated,
      metadata: { action, config, isEnabled, name, priority, type },
      resourceId: id
    });
    return success(c, updated);
  };
