import type { Database } from "@raven/db";
import { guardrailRules } from "@raven/db";
import type { Context } from "hono";
import { ValidationError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { created } from "@/lib/response";
import { checkFeatureGate } from "@/modules/proxy/plan-gate";
import { createGuardrailSchema } from "./schema";

export const createGuardrail = (db: Database) => async (c: Context) => {
  const orgId = c.get("orgId" as never) as string;

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

  void publishEvent(orgId, "guardrail.created", record);
  return created(c, record);
};
