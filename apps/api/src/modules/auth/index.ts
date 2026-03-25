import type { Auth } from "@raven/auth";
import type { Database } from "@raven/db";
import { Hono } from "hono";
import type { Redis } from "ioredis";
import { getInstanceSettings } from "@/lib/instance-settings";

export const createAuthModule = (auth: Auth, db: Database, redis: Redis) => {
  const app = new Hono();

  app.all("/*", async (c) => {
    const url = new URL(c.req.url);
    const isSignUp = url.pathname.endsWith("/sign-up/email");

    if (isSignUp) {
      const cfg = await getInstanceSettings(db, redis);

      if (!cfg.signup_enabled) {
        return c.json(
          { code: "SIGNUP_DISABLED", message: "Registration is disabled" },
          { status: 403 }
        );
      }

      // Validate password length
      const body = await c.req.json().catch(() => null);
      if (body && typeof body === "object" && "password" in body) {
        const password = (body as { password: string }).password;
        if (password.length < cfg.password_min_length) {
          return c.json(
            {
              code: "PASSWORD_TOO_SHORT",
              message: `Password must be at least ${cfg.password_min_length} characters`
            },
            { status: 400 }
          );
        }
      }

      // Re-create request since we consumed the body
      const newRequest = new Request(c.req.raw.url, {
        body: JSON.stringify(body),
        headers: c.req.raw.headers,
        method: c.req.raw.method
      });
      return auth.handler(newRequest);
    }

    return auth.handler(c.req.raw);
  });

  return app;
};
