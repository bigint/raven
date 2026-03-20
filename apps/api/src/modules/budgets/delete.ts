import type { Database } from "@raven/db";
import { budgets } from "@raven/db";
import { eq } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";

export const deleteBudget = (db: Database) => async (c: AuthContext) => {
  const user = c.get("user");
  const id = c.req.param("id") as string;

  const [deleted] = await db
    .delete(budgets)
    .where(eq(budgets.id, id))
    .returning({ id: budgets.id });

  if (!deleted) {
    throw new NotFoundError("Budget not found");
  }

  void publishEvent("budget.deleted", { id });
  void logAudit(db, {
    action: "budget.deleted",
    actorId: user.id,
    resourceId: id,
    resourceType: "budget"
  });
  return success(c, { success: true });
};
