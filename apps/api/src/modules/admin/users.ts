import type { Database } from "@raven/db";
import { members, users } from "@raven/db";
import { count, desc, eq } from "drizzle-orm";
import type { Context } from "hono";

export const getAdminUsers = (db: Database) => async (c: Context) => {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      orgCount: count(members.id)
    })
    .from(users)
    .leftJoin(members, eq(members.userId, users.id))
    .groupBy(users.id)
    .orderBy(desc(users.createdAt));

  return c.json({ data: rows });
};
