import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import { Hono } from "hono";
import type { Redis } from "ioredis";
import { jsonValidator } from "@/lib/validation";
import { createDomain } from "./create";
import { deleteDomain } from "./delete";
import { listDomains } from "./list";
import { addDomainSchema } from "./schema";
import { verifyDomain } from "./verify";

export const createDomainsModule = (db: Database, env: Env, redis: Redis) => {
  const app = new Hono();
  app.get("/", listDomains(db));
  app.post("/", jsonValidator(addDomainSchema), createDomain(db, env));
  app.post("/:id/verify", verifyDomain(db, env, redis));
  app.delete("/:id", deleteDomain(db, env, redis));
  return app;
};
