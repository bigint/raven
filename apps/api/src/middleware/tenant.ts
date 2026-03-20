import type { Database } from "@raven/db";
import { members } from "@raven/db";
import { and, eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import type { Redis } from "ioredis";
import { cachedQuery } from "@/lib/cache-utils";

type TenantContext = {
  Variables: {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
    };
    orgId: string;
    orgRole: string;
  };
};

export const createTenantMiddleware = (db: Database, redis: Redis) => {
  return createMiddleware<TenantContext>(async (c, next) => {
    const orgId = c.req.header("X-Org-Id") ?? c.req.query("orgId");

    if (!orgId) {
      return c.json(
        { code: "VALIDATION_ERROR", message: "Organization ID required" },
        400
      );
    }

    const user = c.get("user");

    if (!user) {
      return c.json(
        { code: "UNAUTHORIZED", message: "Not authenticated" },
        401
      );
    }

    const membership = await cachedQuery(
      redis,
      `member:${user.id}:${orgId}`,
      60,
      async () => {
        const [row] = await db
          .select()
          .from(members)
          .where(
            and(
              eq(members.organizationId, orgId),
              eq(members.userId, user.id)
            )
          )
          .limit(1);
        return row ?? null;
      }
    );

    if (!membership) {
      return c.json(
        { code: "FORBIDDEN", message: "Not a member of this organization" },
        403
      );
    }

    c.set("orgId", orgId);
    c.set("orgRole", membership.role);
    await next();
  });
};
