import type { Database } from "@raven/db";
import { users } from "@raven/db";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { UnauthorizedError, ValidationError } from "@/lib/errors";
import { success } from "@/lib/response";
import { updateProfileSchema } from "./schema";

export const updateProfile = (db: Database) => async (c: Context) => {
  const user = c.get("user" as never) as
    | { id: string; email: string }
    | undefined;
  if (!user) {
    throw new UnauthorizedError("Not authenticated");
  }

  const body = await c.req.json();
  const result = updateProfileSchema.safeParse(body);

  if (!result.success) {
    throw new ValidationError("Invalid request body", {
      errors: result.error.flatten().fieldErrors
    });
  }

  const [updated] = await db
    .update(users)
    .set({ name: result.data.name, updatedAt: new Date() })
    .where(eq(users.id, user.id))
    .returning();

  return success(c, updated);
};
