import type { Database } from "@raven/db";
import { users } from "@raven/db";
import { desc, eq, lt } from "drizzle-orm";
import type { Context } from "hono";
import { z } from "zod";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { success } from "@/lib/response";

const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50)
});

export const getAdminUsers = (db: Database) => async (c: Context) => {
  const { cursor, limit } = paginationSchema.parse(c.req.query());

  const rows = await db
    .select({
      createdAt: users.createdAt,
      email: users.email,
      id: users.id,
      name: users.name,
      role: users.role
    })
    .from(users)
    .where(cursor ? lt(users.id, cursor) : undefined)
    .orderBy(desc(users.createdAt))
    .limit(limit + 1);

  const data = rows.slice(0, limit);

  return success(c, data);
};

export const updateUserRole = (db: Database) => async (c: Context) => {
  const id = c.req.param("id") as string;
  const { role } = await c.req.json<{ role: "admin" | "member" | "viewer" }>();

  const validRoles = ["admin", "member", "viewer"];
  if (!validRoles.includes(role)) {
    throw new ValidationError("Invalid role");
  }

  const [updated] = await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();

  if (!updated) {
    throw new NotFoundError("User not found");
  }

  return success(c, updated);
};

export const deleteUser = (db: Database) => async (c: Context) => {
  const id = c.req.param("id") as string;
  const currentUser = c.get("user");

  if (id === currentUser.id) {
    throw new ForbiddenError("Cannot delete yourself");
  }

  const [deleted] = await db.delete(users).where(eq(users.id, id)).returning();

  if (!deleted) {
    throw new NotFoundError("User not found");
  }

  return success(c, { deleted: true });
};
