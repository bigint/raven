import type { Database } from "@raven/db";
import { guardrailRules } from "@raven/db";
import { eq } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";

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

  void publishEvent("guardrail.deleted", { id });
  void logAudit(db, {
    action: "guardrail.deleted",
    actorId: user.id,
    resourceId: id,
    resourceType: "guardrail"
  });
  return success(c, { success: true });
};
