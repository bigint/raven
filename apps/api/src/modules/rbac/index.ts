import { Hono } from "hono";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";
import { getPermissions, PERMISSIONS, ROLE_PERMISSIONS } from "./permissions";

export const createRBACModule = () => {
  const app = new Hono();

  app.get("/permissions", (c: AppContext) => {
    return success(c, PERMISSIONS);
  });

  app.get("/roles", (c: AppContext) => {
    return success(c, ROLE_PERMISSIONS);
  });

  app.get("/my-permissions", (c: AppContext) => {
    const role = c.get("orgRole");
    const permissions = getPermissions(role);
    return success(c, { permissions, role });
  });

  return app;
};
