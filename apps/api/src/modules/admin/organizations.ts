import type { Database } from "@raven/db";
import { members, organizations, subscriptions } from "@raven/db";
import { and, count, desc, eq, isNull, lt } from "drizzle-orm";
import type { Context } from "hono";
import { z } from "zod";

const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50)
});

export const getAdminOrganizations = (db: Database) => async (c: Context) => {
  const { cursor, limit } = paginationSchema.parse(c.req.query());

  const conditions = [isNull(organizations.deletedAt)];
  if (cursor) {
    conditions.push(lt(organizations.id, cursor));
  }

  const rows = await db
    .select({
      createdAt: organizations.createdAt,
      id: organizations.id,
      memberCount: count(members.id),
      name: organizations.name,
      plan: subscriptions.plan,
      slug: organizations.slug
    })
    .from(organizations)
    .leftJoin(subscriptions, eq(subscriptions.organizationId, organizations.id))
    .leftJoin(members, eq(members.organizationId, organizations.id))
    .where(and(...conditions))
    .groupBy(organizations.id, subscriptions.plan)
    .orderBy(desc(organizations.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const data = rows.slice(0, limit);

  return c.json({
    data,
    hasMore,
    nextCursor: hasMore ? data[data.length - 1]?.id : undefined
  });
};
