import type { Database } from "@raven/db";
import { budgets } from "@raven/db";
import type { z } from "zod";
import { auditAndPublish } from "@/lib/audit";
import { created } from "@/lib/response";
import type { AuthContextWithJson } from "@/lib/types";
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
    void auditAndPublish(db, user, "budget", "created", {
      data: safe,
      metadata: { entityId, entityType, limitAmount, period },
      resourceId: safe.id
    });
    return created(c, safe);
  };
