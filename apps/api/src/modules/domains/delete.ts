import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import { customDomains } from "@raven/db";
import { and, eq } from "drizzle-orm";
import type { Redis } from "ioredis";
import { NotFoundError } from "@/lib/errors";
import type { AppContext } from "@/lib/types";
import { invalidateDomainCache } from "@/modules/proxy/domain-resolver";
import { deleteCustomHostname } from "./cloudflare";

export const deleteDomain =
  (db: Database, env: Env, redis: Redis) => async (c: AppContext) => {
    const orgId = c.get("orgId");
    const domainId = c.req.param("id") ?? "";

    const [domain] = await db
      .select()
      .from(customDomains)
      .where(
        and(
          eq(customDomains.id, domainId),
          eq(customDomains.organizationId, orgId)
        )
      )
      .limit(1);

    if (!domain) {
      throw new NotFoundError("Domain not found");
    }

    // Remove from Cloudflare if it was registered
    if (domain.cloudflareHostnameId) {
      try {
        await deleteCustomHostname(env, domain.cloudflareHostnameId);
      } catch (err) {
        console.error("Failed to remove Cloudflare hostname:", err);
      }
    }

    await db.delete(customDomains).where(eq(customDomains.id, domainId));

    void invalidateDomainCache(redis, domain.domain);

    return c.json({ success: true });
  };
