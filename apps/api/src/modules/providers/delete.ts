import type { Database } from "@raven/db";
import { providerConfigs } from "@raven/db";
import { eq } from "drizzle-orm";
import type { Redis } from "ioredis";
import { auditAndPublish } from "@/lib/audit";
import { cacheKeys } from "@/lib/cache-utils";
import { NotFoundError } from "@/lib/errors";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

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

    await db.delete(providerConfigs).where(eq(providerConfigs.id, id));

    void redis.del(cacheKeys.providerConfigs(existing.provider));

    void auditAndPublish(db, user, "provider", "deleted", { resourceId: id });
    return success(c, { success: true });
  };
