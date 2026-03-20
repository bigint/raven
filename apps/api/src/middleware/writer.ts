import { ForbiddenError } from "@/lib/errors";
import type { Context, Next } from "hono";

export const createWriterMiddleware = () => async (c: Context, next: Next) => {
  const user = c.get("user");
  if (user.role === "viewer") {
    throw new ForbiddenError("Viewers have read-only access");
  }
  return next();
};
