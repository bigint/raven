import type { Database } from "@raven/db";
import { budgets } from "@raven/db";
import { count, eq } from "drizzle-orm";
import type { z } from "zod";
import { publishEvent } from "@/lib/events";
import { created } from "@/lib/response";
import type { AppContextWithJson } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";
import { checkResourceLimit } from "@/modules/proxy/plan-gate";
import type { createBudgetSchema } from "./schema";

type Body = z.infer<typeof createBudgetSchema>;

export const createBudget =
  (db: Database) => async (c: AppContextWithJson<Body>) => {
    const orgId = c.get("orgId");
    const user = c.get("user");
    const { entityType, entityId, limitAmount, period, alertThreshold } =
      c.req.valid("json");

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
