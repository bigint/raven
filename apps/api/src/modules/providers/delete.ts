import type { Database } from "@raven/db";
import { providerConfigs } from "@raven/db";
import { eq } from "drizzle-orm";
import type { Redis } from "ioredis";
import { cacheKeys } from "@/lib/cache-utils";
import { NotFoundError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";

export const deleteProvider =
  (db: Database, redis: Redis) => async (c: AuthContext) => {
    const user = c.get("user");
    const id = c.req.param("id") as string;

    const [existing] = await db
      .select({
        id: providerConfigs.id,
        provider: providerConfigs.provider
      })
      .from(providerConfigs)
      .where(eq(providerConfigs.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Provider not found");
    }

    await db
      .delete(providerConfigs)
      .where(eq(providerConfigs.id, id));

    // Invalidate provider configs and models cache
    void redis.del(cacheKeys.providerConfigs(existing.provider));
    void redis.del(cacheKeys.providerModels(id));

    void publishEvent("provider.deleted", { id });
    void logAudit(db, {
      action: "provider.deleted",
      actorId: user.id,
      resourceId: id,
      resourceType: "provider"
    });
    return success(c, { success: true });
  };
