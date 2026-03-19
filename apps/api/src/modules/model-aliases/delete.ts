import type { Database } from "@raven/db";
import { modelAliases } from "@raven/db";
import { and, eq, isNull } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";

export const deleteModelAlias = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");
  const user = c.get("user");
  const id = c.req.param("id") as string;

  const [existing] = await db
    .select({ id: modelAliases.id })
    .from(modelAliases)
    .where(
      and(
        eq(modelAliases.id, id),
        eq(modelAliases.organizationId, orgId),
        isNull(modelAliases.deletedAt)
      )
    )
    .limit(1);

  if (!existing) {
    throw new NotFoundError("Model alias not found");
  }

  await db
    .update(modelAliases)
    .set({ deletedAt: new Date() })
    .where(
      and(eq(modelAliases.id, id), eq(modelAliases.organizationId, orgId))
    );

  void publishEvent(orgId, "model-alias.deleted", { id });
  void logAudit(db, {
    action: "model-alias.deleted",
    actorId: user.id,
    orgId,
    resourceId: id,
    resourceType: "model-alias"
  });

  return success(c, { success: true });
};
