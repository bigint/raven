import type { Database } from "@raven/db";
import { budgets } from "@raven/db";
import type { Context } from "hono";
import { z } from "zod";
import { ValidationError } from "../../lib/errors.js";
import { publishEvent } from "../../lib/events.js";

const createBudgetSchema = z.object({
  alertThreshold: z.number().min(0).max(1).default(0.8),
  entityId: z.string().min(1),
  entityType: z.enum(["organization", "team", "key"]),
  limitAmount: z.number().positive(),
  period: z.enum(["daily", "monthly"]).default("monthly")
});

export const createBudget = (db: Database) => async (c: Context) => {
  const orgId = c.get("orgId" as never) as string;
  const body = await c.req.json();
  const result = createBudgetSchema.safeParse(body);

  if (!result.success) {
    throw new ValidationError("Invalid request body", {
      errors: result.error.flatten().fieldErrors
    });
  }

  const { entityType, entityId, limitAmount, period, alertThreshold } =
    result.data;

  const [created] = await db
    .insert(budgets)
    .values({
      alertThreshold: alertThreshold.toFixed(2),
      entityId,
      entityType,
      limitAmount: limitAmount.toFixed(2),
      organizationId: orgId,
      period
    })
    .returning();

  void publishEvent(orgId, "budget.created", created);
  return c.json(created, 201);
};
