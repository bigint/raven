import type { Database } from "@raven/db";
import { ipAllowlists } from "@raven/db";
import { and, eq } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";

export const deleteIpRule = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");
  const user = c.get("user");
  const id = c.req.param("id") as string;

  const [existing] = await db
    .select({ id: ipAllowlists.id })
    .from(ipAllowlists)
    .where(and(eq(ipAllowlists.id, id), eq(ipAllowlists.organizationId, orgId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError("IP allowlist rule not found");
  }

  await db
    .delete(ipAllowlists)
    .where(
      and(eq(ipAllowlists.id, id), eq(ipAllowlists.organizationId, orgId))
    );

  void publishEvent(orgId, "ip-allowlist.deleted", { id });
  void logAudit(db, {
    action: "ip-allowlist.deleted",
    actorId: user.id,
    orgId,
    resourceId: id,
    resourceType: "ip-allowlist"
  });
  return success(c, { success: true });
};
