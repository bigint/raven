import type { Database } from "@raven/db";
import { organizations } from "@raven/db";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { ForbiddenError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import { logAudit } from "@/modules/audit-logs/index";

export const deleteSettings = (db: Database) => async (c: Context) => {
  const orgId = c.get("orgId" as never) as string;
  const orgRole = c.get("orgRole" as never) as string;
  const user = c.get("user" as never) as { id: string };

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
