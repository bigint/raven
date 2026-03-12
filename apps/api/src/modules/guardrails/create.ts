import type { Database } from "@raven/db";
import { guardrailRules } from "@raven/db";
import type { Context } from "hono";
import { ValidationError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { created } from "@/lib/response";
import { logAudit } from "@/modules/audit-logs/index";
import { checkFeatureGate } from "@/modules/proxy/plan-gate";
import { createGuardrailSchema } from "./schema";

export const createGuardrail = (db: Database) => async (c: Context) => {
  const orgId = c.get("orgId" as never) as string;
  const user = c.get("user" as never) as { id: string };

  await checkFeatureGate(db, orgId, "hasGuardrails");

  const body = await c.req.json();
  const result = createGuardrailSchema.safeParse(body);

  if (!result.success) {
    throw new ValidationError("Invalid request body", {
      errors: result.error.flatten().fieldErrors
    });
  }

  const { name, type, config, action, isEnabled, priority } = result.data;

  const [record] = await db
    .insert(guardrailRules)
    .values({
      action,
      config,
      isEnabled,
      name,
      organizationId: orgId,
      priority,
      type
    })
    .returning();

  const safe = record as NonNullable<typeof record>;
  void publishEvent(orgId, "guardrail.created", safe);
  void logAudit(db, {
    action: "guardrail.created",
    actorId: user.id,
    metadata: { action, name, type },
    orgId,
    resourceId: safe.id,
    resourceType: "guardrail"
  });
  return created(c, safe);
};
