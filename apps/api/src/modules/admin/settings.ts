import type { Database } from "@raven/db";
import { settings } from "@raven/db";
import type { Context } from "hono";
import { success } from "@/lib/response";

const DEFAULT_SETTINGS: Record<string, string> = {
  allow_registration: "true",
  analytics_retention_days: "365",
  instance_name: "Raven"
};

export const getSettings = (db: Database) => async (c: Context) => {
  const rows = await db.select().from(settings);
  const result = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return success(c, result);
};

export const updateSettings = (db: Database) => async (c: Context) => {
  const body = await c.req.json<Record<string, string>>();
  for (const [key, value] of Object.entries(body)) {
    if (key in DEFAULT_SETTINGS) {
      await db
        .insert(settings)
        .values({ key, value: String(value), updatedAt: new Date() })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: String(value), updatedAt: new Date() }
        });
    }
  }
  return success(c, { updated: true });
};

export const getPublicSettings = (db: Database) => async (c: Context) => {
  const rows = await db.select().from(settings);
  const result: Record<string, string> = {
    allow_registration: DEFAULT_SETTINGS.allow_registration!,
    instance_name: DEFAULT_SETTINGS.instance_name!
  };
  for (const row of rows) {
    if (row.key === "allow_registration" || row.key === "instance_name") {
      result[row.key] = row.value;
    }
  }
  return success(c, result);
};
