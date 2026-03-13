import type { Database } from "@raven/db";
import { budgets } from "@raven/db";
import { and, eq } from "drizzle-orm";
import type { z } from "zod";
import { NotFoundError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import type { AppContextWithJson } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";
import type { updateBudgetSchema } from "./schema";

type Body = z.infer<typeof updateBudgetSchema>;

export const updateBudget =
  (db: Database) => async (c: AppContextWithJson<Body>) => {
    const orgId = c.get("orgId");
    const user = c.get("user");
    const id = c.req.param("id") as string;
    const { limitAmount, alertThreshold, period } = c.req.valid("json");

    const [existing] = await db
      .select({ id: budgets.id })
      .from(budgets)
      .where(and(eq(budgets.id, id), eq(budgets.organizationId, orgId)))
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Budget not found");
    }

    const updates: Partial<typeof budgets.$inferInsert> = {};

    if (limitAmount !== undefined) {
      updates.limitAmount = limitAmount.toFixed(2);
    }

    if (alertThreshold !== undefined) {
      updates.alertThreshold = alertThreshold.toFixed(2);
    }

    if (period !== undefined) {
      updates.period = period;
    }

    const [updated] = await db
      .update(budgets)
      .set(updates)
      .where(and(eq(budgets.id, id), eq(budgets.organizationId, orgId)))
      .returning();

    void publishEvent(orgId, "budget.updated", updated);
    void logAudit(db, {
      action: "budget.updated",
      actorId: user.id,
      metadata: { alertThreshold, limitAmount, period },
      orgId,
      resourceId: id,
      resourceType: "budget"
    });
    return success(c, updated);
  };
