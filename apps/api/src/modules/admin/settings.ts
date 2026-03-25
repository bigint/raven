import type { Database } from "@raven/db";
import { settings } from "@raven/db";
import type { Context } from "hono";
import type { Redis } from "ioredis";
import { invalidateSettingsCache } from "@/lib/instance-settings";
import { success } from "@/lib/response";

const DEFAULT_SETTINGS: Record<string, string> = {
  analytics_retention_days: "365",
  default_max_tokens: "4096",
  // Notifications
  email_notifications_enabled: "false",
  global_rate_limit_rpd: "1000",
  // Proxy
  global_rate_limit_rpm: "60",
  // General
  instance_name: "Raven",
  instance_url: "",
  // Logging
  log_request_bodies: "true",
  log_response_bodies: "false",
  max_request_body_size_mb: "10",
  notify_on_budget_exceeded: "true",
  notify_on_provider_error_spike: "true",
  password_min_length: "8",
  request_timeout_seconds: "300",
  // Email
  resend_api_key: "",
  resend_from_email: "",
  session_timeout_hours: "24",
  // Security
  signup_enabled: "true",
  webhook_retry_count: "3",
  // Webhooks
  webhook_timeout_seconds: "10"
};

/** Keys safe to expose without authentication */
const PUBLIC_KEYS = new Set([
  "instance_name",
  "instance_url",
  "signup_enabled",
  "password_min_length"
]);

export const getSettings = (db: Database) => async (c: Context) => {
  const rows = await db.select().from(settings);
  const result = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return success(c, result);
};

export const updateSettings =
  (db: Database, redis: Redis) => async (c: Context) => {
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
    await invalidateSettingsCache(redis);
    return success(c, { updated: true });
  };

export const getPublicSettings = (db: Database) => async (c: Context) => {
  const rows = await db.select().from(settings);
  const result: Record<string, string> = {};
  for (const key of PUBLIC_KEYS) {
    result[key] = DEFAULT_SETTINGS[key] ?? "";
  }
  for (const row of rows) {
    if (PUBLIC_KEYS.has(row.key)) {
      result[row.key] = row.value;
    }
  }
  return success(c, result);
};
