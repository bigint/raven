import type { Database } from "@raven/db";
import { routingRules } from "@raven/db";
import type { Context } from "hono";
import type { z } from "zod";
import { publishEvent } from "@/lib/events";
import { created } from "@/lib/response";
import { logAudit } from "@/modules/audit-logs/index";
import type { createRoutingRuleSchema } from "./schema";

export const createRoutingRule = (db: Database) => async (c: Context) => {
  const orgId = c.get("orgId" as never) as string;
  const user = c.get("user" as never) as { id: string };
  const data = c.req.valid("json" as never) as z.infer<
    typeof createRoutingRuleSchema
  >;

  const [record] = await db
    .insert(routingRules)
    .values({
      ...data,
      organizationId: orgId
    })
    .returning();

  const safe = record as NonNullable<typeof record>;
  void publishEvent(orgId, "routing-rule.created", safe);
  void logAudit(db, {
    action: "routing-rule.created",
    actorId: user.id,
    metadata: { ...data },
    orgId,
    resourceId: safe.id,
    resourceType: "routing-rule"
  });
  return created(c, safe);
};
