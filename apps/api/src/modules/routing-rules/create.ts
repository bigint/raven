import type { Database } from "@raven/db";
import { routingRules } from "@raven/db";
import type { Context } from "hono";
import { ValidationError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { created } from "@/lib/response";
import { logAudit } from "@/modules/audit-logs/index";
import { createRoutingRuleSchema } from "./schema";

export const createRoutingRule = (db: Database) => async (c: Context) => {
  const orgId = c.get("orgId" as never) as string;
  const user = c.get("user" as never) as { id: string };
  const body = await c.req.json();
  const result = createRoutingRuleSchema.safeParse(body);

  if (!result.success) {
    throw new ValidationError("Invalid request body", {
      errors: result.error.flatten().fieldErrors
    });
  }

  const [record] = await db
    .insert(routingRules)
    .values({
      ...result.data,
      organizationId: orgId
    })
    .returning();

  const safe = record as NonNullable<typeof record>;
  void publishEvent(orgId, "routing-rule.created", safe);
  void logAudit(db, {
    action: "routing-rule.created",
    actorId: user.id,
    metadata: { ...result.data },
    orgId,
    resourceId: safe.id,
    resourceType: "routing-rule"
  });
  return created(c, safe);
};
