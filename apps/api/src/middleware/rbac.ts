import type { Context, Next } from "hono";
import { ForbiddenError } from "@/lib/errors";
import { hasPermission, type Permission } from "@/modules/rbac/permissions";

export const requirePermission = (permission: Permission) => {
  return async (c: Context, next: Next) => {
    const role = c.get("orgRole") as string | undefined;
    if (!role) {
      throw new ForbiddenError("No organization role found");
    }

    if (!hasPermission(role, permission)) {
      throw new ForbiddenError(
        `Insufficient permissions. Required: ${permission}`
      );
    }

    await next();
  };
};

export const requireAnyPermission = (...permissions: Permission[]) => {
  return async (c: Context, next: Next) => {
    const role = c.get("orgRole") as string | undefined;
    if (!role) {
      throw new ForbiddenError("No organization role found");
    }

    const hasAny = permissions.some((p) => hasPermission(role, p));
    if (!hasAny) {
      throw new ForbiddenError(
        `Insufficient permissions. Required one of: ${permissions.join(", ")}`
      );
    }

    await next();
  };
};
