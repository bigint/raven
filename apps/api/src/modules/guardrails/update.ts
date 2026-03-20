import type { Database } from "@raven/db";
import { guardrailRules } from "@raven/db";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import { NotFoundError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import type { AuthContextWithJson } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";
import type { updateGuardrailSchema } from "./schema";

type Body = z.infer<typeof updateGuardrailSchema>;

export const updateGuardrail =
  (db: Database) => async (c: AuthContextWithJson<Body>) => {
    const user = c.get("user");
    const id = c.req.param("id") as string;
    const { name, type, config, action, isEnabled, priority } =
      c.req.valid("json");

    const [existing] = await db
      .select({ id: guardrailRules.id })
      .from(guardrailRules)
      .where(eq(guardrailRules.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Guardrail rule not found");
    }

    const updates: Partial<typeof guardrailRules.$inferInsert> = {};

    if (name !== undefined) {
      updates.name = name;
    }

    if (type !== undefined) {
      updates.type = type;
    }

    if (config !== undefined) {
      updates.config = config;
    }

    if (action !== undefined) {
      updates.action = action;
    }

    if (isEnabled !== undefined) {
      updates.isEnabled = isEnabled;
    }

    if (priority !== undefined) {
      updates.priority = priority;
    }

    const [updated] = await db
      .update(guardrailRules)
      .set(updates)
      .where(eq(guardrailRules.id, id))
      .returning();

    void publishEvent("guardrail.updated", updated);
    void logAudit(db, {
      action: "guardrail.updated",
      actorId: user.id,
      metadata: { action, config, isEnabled, name, priority, type },
      resourceId: id,
      resourceType: "guardrail"
    });
    return success(c, updated);
  };
