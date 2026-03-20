import type { Database } from "@raven/db";
import { budgets, virtualKeys } from "@raven/db";
import { eq, sql } from "drizzle-orm";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

export const listBudgets = (db: Database) => async (c: AuthContext) => {
  const rows = await db
    .select({
      alertThreshold: budgets.alertThreshold,
      createdAt: budgets.createdAt,
      entityId: budgets.entityId,
      entityName: sql<string | null>`
        CASE
          WHEN ${budgets.entityType} = 'key' THEN ${virtualKeys.name}
        END
      `,
      entityType: budgets.entityType,
      id: budgets.id,
      limitAmount: budgets.limitAmount,
      period: budgets.period
    })
    .from(budgets)
    .leftJoin(virtualKeys, eq(budgets.entityId, virtualKeys.id));

  return success(c, rows);
};
