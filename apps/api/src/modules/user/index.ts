import type { Database } from "@raven/db";
import { Hono } from "hono";
import { jsonValidator } from "@/lib/validation";
import { updateProfile } from "./profile";
import { updateProfileSchema } from "./schema";

export const createUserModule = (db: Database) => {
  const app = new Hono();
  app.put("/profile", jsonValidator(updateProfileSchema), updateProfile(db));
  return app;
};
