import type { Database } from "@raven/db";
import { budgets, organizations, virtualKeys } from "@raven/db";
import { eq, sql } from "drizzle-orm";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";

export const listBudgets = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");

  const rows = await db
    .select({
      alertThreshold: budgets.alertThreshold,
      createdAt: budgets.createdAt,
      entityId: budgets.entityId,
      entityName: sql<string | null>`
        CASE
          WHEN ${budgets.entityType} = 'organization' THEN ${organizations.name}
          WHEN ${budgets.entityType} = 'key' THEN ${virtualKeys.name}
        END
      `,
      entityType: budgets.entityType,
      id: budgets.id,
      limitAmount: budgets.limitAmount,
      organizationId: budgets.organizationId,
      period: budgets.period
    })
    .from(budgets)
    .leftJoin(organizations, eq(budgets.organizationId, organizations.id))
    .leftJoin(virtualKeys, eq(budgets.entityId, virtualKeys.id))
    .where(eq(budgets.organizationId, orgId));

  return success(c, rows);
};
