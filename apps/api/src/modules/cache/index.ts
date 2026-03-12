import type { Database } from "@raven/db";
import { Hono } from "hono";
import type { Redis } from "ioredis";
import { flushCache } from "./flush";

export const createCacheModule = (db: Database, redis: Redis) => {
  const app = new Hono();
  app.post("/flush", flushCache(db, redis));
  return app;
};
