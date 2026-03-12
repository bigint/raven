import type { Database } from "@raven/db";
import { budgets } from "@raven/db";
import { count, eq } from "drizzle-orm";
import type { Context } from "hono";
import { ValidationError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { created } from "@/lib/response";
import { checkResourceLimit } from "@/modules/proxy/plan-gate";
import { createBudgetSchema } from "./schema";

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

  const [existing] = await db
    .select({ value: count() })
    .from(budgets)
    .where(eq(budgets.organizationId, orgId));
  await checkResourceLimit(db, orgId, "maxBudgets", existing?.value ?? 0);

  const [record] = await db
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

  void publishEvent(orgId, "budget.created", record);
  return created(c, record);
};
