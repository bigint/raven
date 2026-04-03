import type { Database } from "@raven/db";
import { settings } from "@raven/db";
import type { Context } from "hono";
import type { Redis } from "ioredis";
import { invalidateSettingsCache } from "@/lib/instance-settings";
import { success } from "@/lib/response";

/** All recognized setting keys — used to validate writes */
const VALID_KEYS = new Set([
  "analytics_retention_days",
  "default_max_tokens",
  "email_notifications_enabled",
  "global_rate_limit_rpd",
  "global_rate_limit_rpm",
  "instance_name",
  "instance_url",
  "knowledge_enabled",
  "log_request_bodies",
  "log_response_bodies",
  "max_request_body_size_gb",
  "notify_on_budget_exceeded",
  "notify_on_provider_error_spike",
  "password_min_length",
  "request_timeout_seconds",
  "resend_api_key",
  "resend_from_email",
  "session_timeout_hours",
  "signup_enabled",
  "webhook_retry_count",
  "webhook_timeout_seconds"
]);

/** Keys safe to expose without authentication */
const PUBLIC_KEYS = new Set([
  "instance_name",
  "instance_url",
  "signup_enabled",
  "password_min_length"
]);

export const getSettings = (db: Database) => async (c: Context) => {
  const rows = await db.select().from(settings);
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return success(c, result);
};

export const updateSettings =
  (db: Database, redis: Redis) => async (c: Context) => {
    const body = await c.req.json<Record<string, string>>();
    for (const [key, value] of Object.entries(body)) {
      if (VALID_KEYS.has(key)) {
        await db
          .insert(settings)
          .values({ key, updatedAt: new Date(), value: String(value) })
          .onConflictDoUpdate({
            set: { updatedAt: new Date(), value: String(value) },
            target: settings.key
          });
      }
    }
    await invalidateSettingsCache(redis);
    return success(c, { updated: true });
  };

export const getPublicSettings = (db: Database) => async (c: Context) => {
  const rows = await db.select().from(settings);
  const result: Record<string, string> = {};
  for (const row of rows) {
    if (PUBLIC_KEYS.has(row.key)) {
      result[row.key] = row.value;
    }
  }
  return success(c, result);
};
