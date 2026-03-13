import type { Redis } from "ioredis";
import { ForbiddenError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";

export const flushCache =
  (db: Parameters<typeof logAudit>[0], redis: Redis) =>
  async (c: AppContext) => {
    const orgId = c.get("orgId");
    const orgRole = c.get("orgRole");
    const user = c.get("user");

    if (orgRole !== "owner" && orgRole !== "admin") {
      throw new ForbiddenError("Only admins can flush the cache");
    }

    let deletedCount = 0;
    let cursor = "0";

    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        "MATCH",
        "cache:resp:*",
        "COUNT",
        200
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
        deletedCount += keys.length;
      }
    } while (cursor !== "0");

    void publishEvent(orgId, "cache.flushed", { deletedCount });
    void logAudit(db, {
      action: "cache.flushed",
      actorId: user.id,
      metadata: { deletedCount },
      orgId,
      resourceId: orgId,
      resourceType: "cache"
    });

    return success(c, { deletedCount });
  };
