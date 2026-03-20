import type { Database } from "@raven/db";
import { members, users } from "@raven/db";
import { and, count, desc, eq, isNull, lt } from "drizzle-orm";
import type { Context } from "hono";
import { z } from "zod";

const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50)
});

export const getAdminUsers = (db: Database) => async (c: Context) => {
  const { cursor, limit } = paginationSchema.parse(c.req.query());

  const conditions = [isNull(users.deletedAt)];
  if (cursor) {
    conditions.push(lt(users.id, cursor));
  }

  const rows = await db
    .select({
      createdAt: users.createdAt,
      email: users.email,
      id: users.id,
      name: users.name,
      orgCount: count(members.id),
      role: users.role
    })
    .from(users)
    .leftJoin(members, eq(members.userId, users.id))
    .where(and(...conditions))
    .groupBy(users.id)
    .orderBy(desc(users.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const data = rows.slice(0, limit);

  return c.json({
    data,
    hasMore,
    nextCursor: hasMore ? data[data.length - 1]?.id : undefined
  });
};
