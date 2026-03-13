import type { Database } from "@raven/db";
import { members, organizations, subscriptions } from "@raven/db";
import { count, desc, eq } from "drizzle-orm";
import type { Context } from "hono";

export const getAdminOrganizations = (db: Database) => async (c: Context) => {
  const rows = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      createdAt: organizations.createdAt,
      plan: subscriptions.plan,
      memberCount: count(members.id)
    })
    .from(organizations)
    .leftJoin(
      subscriptions,
      eq(subscriptions.organizationId, organizations.id)
    )
    .leftJoin(members, eq(members.organizationId, organizations.id))
    .groupBy(organizations.id, subscriptions.plan)
    .orderBy(desc(organizations.createdAt));

  return c.json({ data: rows });
};
