import type { Database } from "@raven/db";
import { customDomains, organizations } from "@raven/db";
import { desc, eq } from "drizzle-orm";
import type { Context } from "hono";

export const getAdminDomains = (db: Database) => async (c: Context) => {
  const rows = await db
    .select({
      id: customDomains.id,
      domain: customDomains.domain,
      status: customDomains.status,
      createdAt: customDomains.createdAt,
      verifiedAt: customDomains.verifiedAt,
      orgName: organizations.name,
      orgSlug: organizations.slug
    })
    .from(customDomains)
    .leftJoin(
      organizations,
      eq(organizations.id, customDomains.organizationId)
    )
    .orderBy(desc(customDomains.createdAt));

  return c.json({ data: rows });
};
