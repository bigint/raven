import type { Database } from "@raven/db";
import { budgets } from "@raven/db";
import { count, eq } from "drizzle-orm";
import type { Context } from "hono";
import type { z } from "zod";
import { publishEvent } from "@/lib/events";
import { created } from "@/lib/response";
import { logAudit } from "@/modules/audit-logs/index";
import { checkResourceLimit } from "@/modules/proxy/plan-gate";
import type { createBudgetSchema } from "./schema";

export const createBudget = (db: Database) => async (c: Context) => {
  const orgId = c.get("orgId" as never) as string;
  const user = c.get("user" as never) as { id: string };
  const { entityType, entityId, limitAmount, period, alertThreshold } =
    c.req.valid("json" as never) as z.infer<typeof createBudgetSchema>;

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

  const safe = record as NonNullable<typeof record>;
  void publishEvent(orgId, "budget.created", safe);
  void logAudit(db, {
    action: "budget.created",
    actorId: user.id,
    metadata: { entityId, entityType, limitAmount, period },
    orgId,
    resourceId: safe.id,
    resourceType: "budget"
  });
  return created(c, safe);
};
