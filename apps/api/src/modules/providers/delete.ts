import type { Database } from "@raven/db";
import { providerConfigs } from "@raven/db";
import { and, eq } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";

export const deleteProvider = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");
  const user = c.get("user");
  const id = c.req.param("id") as string;

  const [existing] = await db
    .select({ id: providerConfigs.id })
    .from(providerConfigs)
    .where(
      and(eq(providerConfigs.id, id), eq(providerConfigs.organizationId, orgId))
    )
    .limit(1);

  if (!existing) {
    throw new NotFoundError("Provider not found");
  }

  await db
    .delete(providerConfigs)
    .where(
      and(eq(providerConfigs.id, id), eq(providerConfigs.organizationId, orgId))
    );

  void publishEvent(orgId, "provider.deleted", { id });
  void logAudit(db, {
    action: "provider.deleted",
    actorId: user.id,
    orgId,
    resourceId: id,
    resourceType: "provider"
  });
  return success(c, { success: true });
};
