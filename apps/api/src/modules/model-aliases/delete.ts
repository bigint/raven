import type { Database } from "@raven/db";
import { modelAliases } from "@raven/db";
import { and, eq, isNull } from "drizzle-orm";
import type { Redis } from "ioredis";
import { cacheKeys } from "@/lib/cache-utils";
import { NotFoundError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";

export const deleteModelAlias =
  (db: Database, redis: Redis) => async (c: AppContext) => {
    const orgId = c.get("orgId");
    const user = c.get("user");
    const id = c.req.param("id") as string;

    const [existing] = await db
      .select({ alias: modelAliases.alias, id: modelAliases.id })
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

    // Invalidate model alias cache for this org + alias
    void redis.del(cacheKeys.modelAlias(orgId, existing.alias));

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
