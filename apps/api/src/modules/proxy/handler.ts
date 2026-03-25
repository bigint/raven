import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import type { Context } from "hono";
import type { Redis } from "ioredis";
import { runPipeline } from "./pipeline";

export const proxyHandler = (
  db: Database,
  redis: Redis,
  env: Env
): ((c: Context) => Promise<Response>) => {
  return async (c: Context): Promise<Response> => {
    const method = c.req.method;
    const hasBody = method !== "GET" && method !== "HEAD";

    return runPipeline({
      authHeader: c.req.header("Authorization") ?? "",
      bodyText: hasBody ? await c.req.text() : undefined,
      db,
      env,
      incomingHeaders: c.req.header(),
      method,
      path: c.req.path,
      providerPath: c.req.path,
      redis,
      sessionId: c.req.header("x-session-id") ?? null,
      userAgent: c.req.header("user-agent") ?? null,
      userIdHeader: c.req.header("x-user-id")
    });
  };
};
