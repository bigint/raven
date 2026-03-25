import type { Database } from "@raven/db";
import { routingRules } from "@raven/db";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import { auditAndPublish } from "@/lib/audit";
import { NotFoundError } from "@/lib/errors";
import { success } from "@/lib/response";
import type { AuthContextWithJson } from "@/lib/types";
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
    void auditAndPublish(db, user, "routing-rule", "updated", {
      data: record,
      metadata: { ...data },
      resourceId: record.id
    });
    return success(c, record);
  };
