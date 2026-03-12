import type { Database } from "@raven/db";
import { routingRules } from "@raven/db";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import { logAudit } from "@/modules/audit-logs/index";
import { updateRoutingRuleSchema } from "./schema";

export const updateRoutingRule = (db: Database) => async (c: Context) => {
  const orgId = c.get("orgId" as never) as string;
  const user = c.get("user" as never) as { id: string };
  const id = c.req.param("id") as string;
  const body = await c.req.json();
  const result = updateRoutingRuleSchema.safeParse(body);

  if (!result.success) {
    throw new ValidationError("Invalid request body", {
      errors: result.error.flatten().fieldErrors
    });
  }

  const [existing] = await db
    .select({ id: routingRules.id })
    .from(routingRules)
    .where(and(eq(routingRules.id, id), eq(routingRules.organizationId, orgId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError("Routing rule not found");
  }

  const [updated] = await db
    .update(routingRules)
    .set({ ...result.data, updatedAt: new Date() })
    .where(and(eq(routingRules.id, id), eq(routingRules.organizationId, orgId)))
    .returning();

  const record = updated as NonNullable<typeof updated>;
  void publishEvent(orgId, "routing-rule.updated", record);
  void logAudit(db, {
    action: "routing-rule.updated",
    actorId: user.id,
    metadata: { ...result.data },
    orgId,
    resourceId: record.id,
    resourceType: "routing-rule"
  });
  return success(c, record);
};
