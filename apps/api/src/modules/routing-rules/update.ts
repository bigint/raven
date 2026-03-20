import type { Database } from "@raven/db";
import { routingRules } from "@raven/db";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import { NotFoundError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import type { AuthContextWithJson } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";
import type { updateRoutingRuleSchema } from "./schema";

type Body = z.infer<typeof updateRoutingRuleSchema>;

export const updateRoutingRule =
  (db: Database) => async (c: AuthContextWithJson<Body>) => {
    const user = c.get("user");
    const id = c.req.param("id") as string;
    const data = c.req.valid("json");

    const [existing] = await db
      .select({ id: routingRules.id })
      .from(routingRules)
      .where(eq(routingRules.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Routing rule not found");
    }

    const [updated] = await db
      .update(routingRules)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(routingRules.id, id))
      .returning();

    const record = updated as NonNullable<typeof updated>;
    void publishEvent("routing-rule.updated", record);
    void logAudit(db, {
      action: "routing-rule.updated",
      actorId: user.id,
      metadata: { ...data },
      resourceId: record.id,
      resourceType: "routing-rule"
    });
    return success(c, record);
  };
