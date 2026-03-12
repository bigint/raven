import type { Database } from "@raven/db";
import { routingRules } from "@raven/db";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import { NotFoundError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import { logAudit } from "@/modules/audit-logs/index";

export const deleteRoutingRule = (db: Database) => async (c: Context) => {
  const orgId = c.get("orgId" as never) as string;
  const user = c.get("user" as never) as { id: string };
  const id = c.req.param("id") as string;

  const [existing] = await db
    .select({ id: routingRules.id })
    .from(routingRules)
    .where(and(eq(routingRules.id, id), eq(routingRules.organizationId, orgId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError("Routing rule not found");
  }

  await db
    .delete(routingRules)
    .where(
      and(eq(routingRules.id, id), eq(routingRules.organizationId, orgId))
    );

  void publishEvent(orgId, "routing-rule.deleted", { id });
  void logAudit(db, {
    action: "routing-rule.deleted",
    actorId: user.id,
    orgId,
    resourceId: id,
    resourceType: "routing-rule"
  });
  return success(c, { success: true });
};
