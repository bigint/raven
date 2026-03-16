import type { Database } from "@raven/db";
import { policies } from "@raven/db";
import { and, eq } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";

export const deletePolicy = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");
  const user = c.get("user");
  const id = c.req.param("id") as string;

  const [existing] = await db
    .select({ id: policies.id })
    .from(policies)
    .where(and(eq(policies.id, id), eq(policies.organizationId, orgId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError("Policy not found");
  }

  // Cascading delete removes associated policyRules
  await db
    .delete(policies)
    .where(and(eq(policies.id, id), eq(policies.organizationId, orgId)));

  void publishEvent(orgId, "policy.deleted", { id });
  void logAudit(db, {
    action: "policy.deleted",
    actorId: user.id,
    orgId,
    resourceId: id,
    resourceType: "policy"
  });

  return success(c, { success: true });
};
