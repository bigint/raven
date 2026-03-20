import type { Context, Next } from "hono";
import { ForbiddenError } from "@/lib/errors";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const createWriterMiddleware = () => async (c: Context, next: Next) => {
  if (MUTATION_METHODS.has(c.req.method)) {
    const user = c.get("user");
    if (user.role === "viewer") {
      throw new ForbiddenError("Viewers have read-only access");
    }
  }
  return next();
};
