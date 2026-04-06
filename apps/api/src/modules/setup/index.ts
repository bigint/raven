import type { Auth } from "@raven/auth";
import type { Database } from "@raven/db";
import { users } from "@raven/db";
import { count, sql } from "drizzle-orm";
import { Hono } from "hono";
import { ConflictError, ValidationError } from "@/lib/errors";
import { success } from "@/lib/response";
import { setupCompleteSchema } from "./schema";

export const createSetupModule = (db: Database, auth: Auth) => {
  const app = new Hono();

  // Public: check if instance needs setup
  app.get("/status", async (c) => {
    const [result] = await db.select({ value: count() }).from(users);
    return success(c, { needsSetup: result?.value === 0 });
  });

  // Public: complete initial setup (create admin account)
  app.post("/complete", async (c) => {
    const body = await c.req.json();
    const parsed = setupCompleteSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid setup data", {
        errors: parsed.error.flatten().fieldErrors
      });
    }

    const { email, name, password } = parsed.data;

    // Acquire a PostgreSQL advisory lock to serialize setup attempts
    const SETUP_LOCK_ID = 8675309;
    const [lock] = await db.execute(
      sql`SELECT pg_try_advisory_lock(${SETUP_LOCK_ID}) AS acquired`
    );

    if (!lock?.acquired) {
      throw new ConflictError("Setup is already in progress");
    }

    try {
      // Guard: reject if any users already exist
      const [userCount] = await db.select({ value: count() }).from(users);
      if (userCount && userCount.value > 0) {
        throw new ConflictError("Setup has already been completed");
      }

      // Create admin user via Better Auth (database hook auto-promotes first user to admin)
      const result = await auth.api
        .signUpEmail({
          body: { email, name, password }
        })
        .catch(() => {
          throw new ConflictError(
            "Failed to create admin account — email may already be registered"
          );
        });

      return success(c, {
        user: {
          email: result.user.email,
          id: result.user.id,
          name: result.user.name
        }
      });
    } finally {
      await db.execute(
        sql`SELECT pg_advisory_unlock(${SETUP_LOCK_ID})`
      );
    }
  });

  return app;
};
