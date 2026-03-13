import type { Database } from "@raven/db";
import { organizations } from "@raven/db";
import { eq } from "drizzle-orm";
import { ForbiddenError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";

export const deleteSettings = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");
  const orgRole = c.get("orgRole");
  const user = c.get("user");

  if (orgRole !== "owner") {
    throw new ForbiddenError("Only the owner can delete the organization");
  }

  await db.delete(organizations).where(eq(organizations.id, orgId));

  void publishEvent(orgId, "settings.deleted", { id: orgId });
  void logAudit(db, {
    action: "org.deleted",
    actorId: user.id,
    orgId,
    resourceId: orgId,
    resourceType: "organization"
  });
  return success(c, { success: true });
};
