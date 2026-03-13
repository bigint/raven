import type { Database } from "@raven/db";
import { budgets } from "@raven/db";
import { eq } from "drizzle-orm";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";

export const listBudgets = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");

  const rows = await db
    .select()
    .from(budgets)
    .where(eq(budgets.organizationId, orgId));

  return success(c, rows);
};
