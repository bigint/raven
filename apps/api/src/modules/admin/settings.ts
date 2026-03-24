import type { Database } from "@raven/db";
import { settings } from "@raven/db";
import type { Context } from "hono";
import { success } from "@/lib/response";

const DEFAULT_SETTINGS: Record<string, string> = {
  analytics_retention_days: "365",
  resend_api_key: "",
  resend_from_email: ""
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
        .values({ key, updatedAt: new Date(), value: String(value) })
        .onConflictDoUpdate({
          set: { updatedAt: new Date(), value: String(value) },
          target: settings.key
        });
    }
  }
  return success(c, { updated: true });
};

export const getPublicSettings = (_db: Database) => async (c: Context) => {
  return success(c, {});
};
