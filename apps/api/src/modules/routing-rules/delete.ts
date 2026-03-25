import type { Database } from "@raven/db";
import { routingRules } from "@raven/db";
import { eq } from "drizzle-orm";
import { auditAndPublish } from "@/lib/audit";
import { NotFoundError } from "@/lib/errors";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

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

  void auditAndPublish(db, user, "routing-rule", "deleted", { resourceId: id });
  return success(c, { success: true });
};
