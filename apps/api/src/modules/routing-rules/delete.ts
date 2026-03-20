import type { Database } from "@raven/db";
import { routingRules } from "@raven/db";
import { eq } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";

export const deleteRoutingRule = (db: Database) => async (c: AuthContext) => {
  const user = c.get("user");
  const id = c.req.param("id") as string;

  const [deleted] = await db
    .delete(routingRules)
    .where(eq(routingRules.id, id))
    .returning({ id: routingRules.id });

  if (!deleted) {
    throw new NotFoundError("Routing rule not found");
  }

  void publishEvent("routing-rule.deleted", { id });
  void logAudit(db, {
    action: "routing-rule.deleted",
    actorId: user.id,
    resourceId: id,
    resourceType: "routing-rule"
  });
  return success(c, { success: true });
};
