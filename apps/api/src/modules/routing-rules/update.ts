import type { Database } from "@raven/db";
import { routingRules } from "@raven/db";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import type { z } from "zod";
import { NotFoundError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import { logAudit } from "@/modules/audit-logs/index";
import type { updateRoutingRuleSchema } from "./schema";

export const updateRoutingRule = (db: Database) => async (c: Context) => {
  const orgId = c.get("orgId" as never) as string;
  const user = c.get("user" as never) as { id: string };
  const id = c.req.param("id") as string;
  const data = c.req.valid("json" as never) as z.infer<
    typeof updateRoutingRuleSchema
  >;

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
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(routingRules.id, id), eq(routingRules.organizationId, orgId)))
    .returning();

  const record = updated as NonNullable<typeof updated>;
  void publishEvent(orgId, "routing-rule.updated", record);
  void logAudit(db, {
    action: "routing-rule.updated",
    actorId: user.id,
    metadata: { ...data },
    orgId,
    resourceId: record.id,
    resourceType: "routing-rule"
  });
  return success(c, record);
};
