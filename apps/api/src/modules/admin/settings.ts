import type { Database } from "@raven/db";
import { settings } from "@raven/db";
import type { Context } from "hono";
import { success } from "@/lib/response";

const DEFAULT_SETTINGS: Record<string, string> = {
  // General
  instance_name: "Raven",
  instance_url: "",
  analytics_retention_days: "365",
  // Security
  signup_enabled: "true",
  session_timeout_hours: "24",
  password_min_length: "8",
  // Proxy
  global_rate_limit_rpm: "60",
  global_rate_limit_rpd: "1000",
  max_request_body_size_mb: "10",
  request_timeout_seconds: "300",
  default_max_tokens: "4096",
  // Logging
  log_request_bodies: "true",
  log_response_bodies: "false",
  // Webhooks
  webhook_timeout_seconds: "10",
  webhook_retry_count: "3",
  // Notifications
  email_notifications_enabled: "false",
  notify_on_budget_exceeded: "true",
  notify_on_provider_error_spike: "true",
  // Email
  resend_api_key: "",
  resend_from_email: ""
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
