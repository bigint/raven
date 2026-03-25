import type { Database } from "@raven/db";
import { guardrailRules } from "@raven/db";
import { eq } from "drizzle-orm";
import { auditAndPublish } from "@/lib/audit";
import { NotFoundError } from "@/lib/errors";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

export const deleteGuardrail = (db: Database) => async (c: AuthContext) => {
  const user = c.get("user");
  const id = c.req.param("id") as string;

  const [deleted] = await db
    .delete(guardrailRules)
    .where(eq(guardrailRules.id, id))
    .returning({ id: guardrailRules.id });

  if (!deleted) {
    throw new NotFoundError("Guardrail rule not found");
  }

  void auditAndPublish(db, user, "guardrail", "deleted", { resourceId: id });
  return success(c, { success: true });
};
