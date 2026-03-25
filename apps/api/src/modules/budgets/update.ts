import type { Database } from "@raven/db";
import { budgets } from "@raven/db";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import { auditAndPublish } from "@/lib/audit";
import { NotFoundError } from "@/lib/errors";
import { success } from "@/lib/response";
import type { AuthContextWithJson } from "@/lib/types";
import { filterUndefined } from "@/lib/utils";
import type { updateBudgetSchema } from "./schema";

type Body = z.infer<typeof updateBudgetSchema>;

export const updateBudget =
  (db: Database) => async (c: AuthContextWithJson<Body>) => {
    const user = c.get("user");
    const id = c.req.param("id") as string;
    const { limitAmount, alertThreshold, period } = c.req.valid("json");

    const [updated] = await db
      .update(budgets)
      .set({
        ...filterUndefined({ period }),
        ...(limitAmount !== undefined && {
          limitAmount: limitAmount.toFixed(2)
        }),
        ...(alertThreshold !== undefined && {
          alertThreshold: alertThreshold.toFixed(2)
        })
      })
      .where(eq(budgets.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundError("Budget not found");
    }

    void auditAndPublish(db, user, "budget", "updated", {
      data: updated,
      metadata: { alertThreshold, limitAmount, period },
      resourceId: id
    });
    return success(c, updated);
  };
