import type { Database } from "@raven/db";
import { customDomains } from "@raven/db";
import { and, eq } from "drizzle-orm";
import type { Redis } from "ioredis";

export type ProxyEnv = {
  Variables: {
    domainOrgId: string;
  };
};

const CACHE_TTL = 300; // 5 minutes
const cacheKey = (host: string) => `domain:${host}`;

export const resolveCustomDomain = async (
  db: Database,
  redis: Redis,
  hostname: string
): Promise<string | null> => {
  // Check Redis cache first
  const cached = await redis.get(cacheKey(hostname));
  if (cached) return cached;
  if (cached === "") return null; // negative cache

  // Query database
  const [domain] = await db
    .select({ organizationId: customDomains.organizationId })
    .from(customDomains)
    .where(
      and(
        eq(customDomains.domain, hostname),
        eq(customDomains.status, "active")
      )
    )
    .limit(1);

  if (!domain) {
    // Negative cache to avoid repeated DB lookups for invalid domains
    await redis.set(cacheKey(hostname), "", "EX", 60);
    return null;
  }

  await redis.set(cacheKey(hostname), domain.organizationId, "EX", CACHE_TTL);
  return domain.organizationId;
};

export const invalidateDomainCache = async (
  redis: Redis,
  hostname: string
): Promise<void> => {
  await redis.del(cacheKey(hostname));
};
