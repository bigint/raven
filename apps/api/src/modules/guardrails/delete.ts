import type { Database } from "@raven/db";
import { guardrailRules } from "@raven/db";
import { and, eq } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";

export const deleteGuardrail = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");
  const user = c.get("user");
  const id = c.req.param("id") as string;

  const [deleted] = await db
    .delete(guardrailRules)
    .where(
      and(eq(guardrailRules.id, id), eq(guardrailRules.organizationId, orgId))
    )
    .returning({ id: guardrailRules.id });

  if (!deleted) {
    throw new NotFoundError("Guardrail rule not found");
  }

  void publishEvent(orgId, "guardrail.deleted", { id });
  void logAudit(db, {
    action: "guardrail.deleted",
    actorId: user.id,
    orgId,
    resourceId: id,
    resourceType: "guardrail"
  });
  return success(c, { success: true });
};
