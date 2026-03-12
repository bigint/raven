import type { Auth } from "@raven/auth";
import { createMiddleware } from "hono/factory";

type AuthContext = {
  Variables: {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
    };
    session: {
      id: string;
      userId: string;
    };
  };
};

export const createAuthMiddleware = (auth: Auth) => {
  return createMiddleware<AuthContext>(async (c, next) => {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers
    });

    if (!session) {
      return c.json(
        { code: "UNAUTHORIZED", message: "Not authenticated" },
        401
      );
    }

    c.set("user", session.user);
    c.set("session", session.session);
    await next();
  });
};
