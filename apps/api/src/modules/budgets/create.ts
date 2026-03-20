import type { Database } from "@raven/db";
import { budgets } from "@raven/db";
import type { z } from "zod";
import { publishEvent } from "@/lib/events";
import { created } from "@/lib/response";
import type { AuthContextWithJson } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";
import type { createBudgetSchema } from "./schema";

type Body = z.infer<typeof createBudgetSchema>;

export const createBudget =
  (db: Database) => async (c: AuthContextWithJson<Body>) => {
    const user = c.get("user");
    const { entityType, entityId, limitAmount, period, alertThreshold } =
      c.req.valid("json");

    const [record] = await db
      .insert(budgets)
      .values({
        alertThreshold: alertThreshold.toFixed(2),
        entityId,
        entityType,
        limitAmount: limitAmount.toFixed(2),
        period
      })
      .returning();

    const safe = record as NonNullable<typeof record>;
    void publishEvent("budget.created", safe);
    void logAudit(db, {
      action: "budget.created",
      actorId: user.id,
      metadata: { entityId, entityType, limitAmount, period },
      resourceId: safe.id,
      resourceType: "budget"
    });
    return created(c, safe);
  };
