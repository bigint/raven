import type { Database } from "@raven/db";
import { members, users } from "@raven/db";
import { count, desc, eq, isNull } from "drizzle-orm";
import type { Context } from "hono";

export const getAdminUsers = (db: Database) => async (c: Context) => {
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
    .where(isNull(users.deletedAt))
    .groupBy(users.id)
    .orderBy(desc(users.createdAt));

  return c.json({ data: rows });
};
