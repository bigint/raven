import type { Database } from "@raven/db";
import { customDomains, organizations } from "@raven/db";
import { desc, eq } from "drizzle-orm";
import type { Context } from "hono";

export const getAdminDomains = (db: Database) => async (c: Context) => {
  const rows = await db
    .select({
      createdAt: customDomains.createdAt,
      domain: customDomains.domain,
      id: customDomains.id,
      orgName: organizations.name,
      orgSlug: organizations.slug,
      status: customDomains.status,
      verifiedAt: customDomains.verifiedAt
    })
    .from(customDomains)
    .leftJoin(organizations, eq(organizations.id, customDomains.organizationId))
    .orderBy(desc(customDomains.createdAt));

  return c.json({ data: rows });
};
