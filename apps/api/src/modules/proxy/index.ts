import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import { Hono } from "hono";
import type { Redis } from "ioredis";
import { NotFoundError } from "@/lib/errors";
import type { ProxyEnv } from "./domain-resolver";
import { resolveCustomDomain } from "./domain-resolver";
import { proxyHandler } from "./handler";

export const createProxyModule = (db: Database, redis: Redis, env: Env) => {
  const app = new Hono();
  app.all("/*", proxyHandler(db, redis, env));
  return app;
};

export const createCustomDomainProxyModule = (
  db: Database,
  redis: Redis,
  env: Env
) => {
  const app = new Hono<ProxyEnv>();
  app.all(
    "/*",
    async (c, next) => {
      const host = (c.req.header("host") ?? "").split(":")[0] ?? "";
      const orgId = await resolveCustomDomain(db, redis, host);
      if (!orgId) {
        throw new NotFoundError("Unknown custom domain");
      }
      c.set("domainOrgId", orgId);
      await next();
    },
    proxyHandler(db, redis, env)
  );
  return app;
};
