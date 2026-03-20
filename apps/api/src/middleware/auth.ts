import type { Auth } from "@raven/auth";
import { createMiddleware } from "hono/factory";

type AuthContext = {
  Variables: {
    user: {
      id: string;
      email: string;
      name: string;
      role: "admin" | "member" | "viewer";
    };
    session: {
      id: string;
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

    c.set("user", {
      email: session.user.email,
      id: session.user.id,
      name: session.user.name,
      role: (session.user.role ?? "viewer") as "admin" | "member" | "viewer"
    });
    c.set("session", { id: session.session.id });
    await next();
  });
};
