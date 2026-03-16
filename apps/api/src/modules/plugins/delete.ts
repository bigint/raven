import type { Database } from "@raven/db";
import { plugins } from "@raven/db";
import { and, eq } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";

export const deletePlugin = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");
  const user = c.get("user");
  const id = c.req.param("id") as string;

  const [existing] = await db
    .select({ id: plugins.id })
    .from(plugins)
    .where(and(eq(plugins.id, id), eq(plugins.organizationId, orgId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError("Plugin not found");
  }

  await db
    .delete(plugins)
    .where(and(eq(plugins.id, id), eq(plugins.organizationId, orgId)));

  void publishEvent(orgId, "plugin.deleted", { id });
  void logAudit(db, {
    action: "plugin.deleted",
    actorId: user.id,
    orgId,
    resourceId: id,
    resourceType: "plugin"
  });
  return success(c, { success: true });
};
