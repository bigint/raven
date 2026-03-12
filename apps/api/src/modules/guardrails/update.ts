import type { Database } from "@raven/db";
import { guardrailRules } from "@raven/db";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import { logAudit } from "@/modules/audit-logs/index";
import { updateGuardrailSchema } from "./schema";

export const updateGuardrail = (db: Database) => async (c: Context) => {
  const orgId = c.get("orgId" as never) as string;
  const user = c.get("user" as never) as { id: string };
  const id = c.req.param("id") as string;
  const body = await c.req.json();
  const result = updateGuardrailSchema.safeParse(body);

  if (!result.success) {
    throw new ValidationError("Invalid request body", {
      errors: result.error.flatten().fieldErrors
    });
  }

  const [existing] = await db
    .select({ id: guardrailRules.id })
    .from(guardrailRules)
    .where(
      and(eq(guardrailRules.id, id), eq(guardrailRules.organizationId, orgId))
    )
    .limit(1);

  if (!existing) {
    throw new NotFoundError("Guardrail rule not found");
  }

  const { name, type, config, action, isEnabled, priority } = result.data;
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
    .where(
      and(eq(guardrailRules.id, id), eq(guardrailRules.organizationId, orgId))
    )
    .returning();

  void publishEvent(orgId, "guardrail.updated", updated);
  void logAudit(db, {
    action: "guardrail.updated",
    actorId: user.id,
    metadata: { action, config, isEnabled, name, priority, type },
    orgId,
    resourceId: id,
    resourceType: "guardrail"
  });
  return success(c, updated);
};
