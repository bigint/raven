import type { Database } from "@raven/db";
import { budgets } from "@raven/db";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import { NotFoundError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import { logAudit } from "@/modules/audit-logs/index";

export const deleteBudget = (db: Database) => async (c: Context) => {
  const orgId = c.get("orgId" as never) as string;
  const user = c.get("user" as never) as { id: string };
  const id = c.req.param("id") as string;

  const [existing] = await db
    .select({ id: budgets.id })
    .from(budgets)
    .where(and(eq(budgets.id, id), eq(budgets.organizationId, orgId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError("Budget not found");
  }

  await db
    .delete(budgets)
    .where(and(eq(budgets.id, id), eq(budgets.organizationId, orgId)));

  void publishEvent(orgId, "budget.deleted", { id });
  void logAudit(db, {
    action: "budget.deleted",
    actorId: user.id,
    orgId,
    resourceId: id,
    resourceType: "budget"
  });
  return success(c, { success: true });
};
