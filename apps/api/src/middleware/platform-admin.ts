import { createMiddleware } from "hono/factory";
import { ForbiddenError } from "@/lib/errors";

type AuthEnv = {
  Variables: {
    user: {
      id: string;
      email: string;
      name: string;
      role: "admin" | "member" | "viewer";
    };
    session: { id: string };
  };
};

export const platformAdminMiddleware = createMiddleware<AuthEnv>(
  async (c, next) => {
    const user = c.get("user");
    if (user.role !== "admin") {
      throw new ForbiddenError("Platform admin access required");
    }
    await next();
  }
);
