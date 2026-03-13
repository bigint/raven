import type { Database } from "@raven/db";
import { routingRules } from "@raven/db";
import { and, eq } from "drizzle-orm";
import type { z } from "zod";
import { NotFoundError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import type { AppContextWithJson } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";
import type { updateRoutingRuleSchema } from "./schema";

type Body = z.infer<typeof updateRoutingRuleSchema>;

export const updateRoutingRule =
  (db: Database) => async (c: AppContextWithJson<Body>) => {
    const orgId = c.get("orgId");
    const user = c.get("user");
    const id = c.req.param("id") as string;
    const data = c.req.valid("json");

    const [existing] = await db
      .select({ id: routingRules.id })
      .from(routingRules)
      .where(
        and(eq(routingRules.id, id), eq(routingRules.organizationId, orgId))
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Routing rule not found");
    }

    const [updated] = await db
      .update(routingRules)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(eq(routingRules.id, id), eq(routingRules.organizationId, orgId))
      )
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
