import type { Auth } from "@raven/auth";
import type { Database } from "@raven/db";
import { users } from "@raven/db";
import { count } from "drizzle-orm";
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

    // Guard: reject if any users already exist
    const [userCount] = await db.select({ value: count() }).from(users);
    if (userCount && userCount.value > 0) {
      throw new ConflictError("Setup has already been completed");
    }

    // Create admin user via Better Auth (database hook auto-promotes first user to admin)
    // TOCTOU race is acceptable; signUpEmail will fail if email is already taken
    const result = await auth.api
      .signUpEmail({
        body: { email, name, password }
      })
      .catch(() => {
        throw new ConflictError(
          "Failed to create admin account — email may already be registered"
        );
      });

    // Return session headers so the user is signed in
    const authHeaders =
      "headers" in result ? (result.headers as Headers) : undefined;
    const responseHeaders: Record<string, string> = {
      "Content-Type": "application/json"
    };
    if (authHeaders) {
      for (const [key, value] of authHeaders.entries()) {
        responseHeaders[key] = value;
      }
    }

    return new Response(
      JSON.stringify({
        data: {
          user: {
            email: result.user.email,
            id: result.user.id,
            name: result.user.name
          }
        }
      }),
      { headers: responseHeaders, status: 200 }
    );
  });

  return app;
};
