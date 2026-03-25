import type { Database } from "@raven/db";
import { budgets } from "@raven/db";
import { eq } from "drizzle-orm";
import { auditAndPublish } from "@/lib/audit";
import { NotFoundError } from "@/lib/errors";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

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

  void auditAndPublish(db, user, "budget", "deleted", { resourceId: id });
  return success(c, { success: true });
};
