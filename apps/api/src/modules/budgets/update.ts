import type { Database } from "@raven/db";
import { budgets } from "@raven/db";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import { z } from "zod";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";

const updateBudgetSchema = z.object({
  alertThreshold: z.number().min(0).max(1).optional(),
  limitAmount: z.number().positive().optional(),
  period: z.enum(["daily", "monthly"]).optional()
});

export const updateBudget = (db: Database) => async (c: Context) => {
  const orgId = c.get("orgId" as never) as string;
  const id = c.req.param("id") as string;
  const body = await c.req.json();
  const result = updateBudgetSchema.safeParse(body);

  if (!result.success) {
    throw new ValidationError("Invalid request body", {
      errors: result.error.flatten().fieldErrors
    });
  }

  const [existing] = await db
    .select({ id: budgets.id })
    .from(budgets)
    .where(and(eq(budgets.id, id), eq(budgets.organizationId, orgId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError("Budget not found");
  }

  const { limitAmount, alertThreshold, period } = result.data;
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
  return c.json(updated);
};
