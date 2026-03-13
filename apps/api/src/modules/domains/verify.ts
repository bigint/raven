import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import { customDomains } from "@raven/db";
import { and, eq } from "drizzle-orm";
import type { Redis } from "ioredis";
import { NotFoundError, ValidationError } from "@/lib/errors";
import type { AppContext } from "@/lib/types";
import { invalidateDomainCache } from "@/modules/proxy/domain-resolver";
import { createCustomHostname } from "./cloudflare";
import { verifyDomainOwnership } from "./dns";

export const verifyDomain =
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

    if (domain.status === "active") {
      return c.json({ data: domain });
    }

    const verified = await verifyDomainOwnership(
      domain.domain,
      domain.verificationToken
    );

    if (!verified) {
      await db
        .update(customDomains)
        .set({ status: "failed" })
        .where(eq(customDomains.id, domainId));

      throw new ValidationError(
        "DNS verification failed. Ensure the TXT record is set correctly and has propagated."
      );
    }

    // Create Cloudflare custom hostname
    let cloudflareHostnameId: string | null = null;
    try {
      cloudflareHostnameId = await createCustomHostname(env, domain.domain);
    } catch (err) {
      console.error("Cloudflare custom hostname creation failed:", err);
      // Still mark as verified even if Cloudflare fails — can retry later
    }

    const [updated] = await db
      .update(customDomains)
      .set({
        cloudflareHostnameId,
        status: cloudflareHostnameId ? "active" : "verified",
        verifiedAt: new Date()
      })
      .where(eq(customDomains.id, domainId))
      .returning();

    // Invalidate any negative cache for this domain
    void invalidateDomainCache(redis, domain.domain);

    return c.json({ data: updated });
  };
