import type { Database } from "@raven/db";
import { settings } from "@raven/db";
import type { Redis } from "ioredis";

export interface InstanceSettings {
  readonly instance_name: string;
  readonly instance_url: string;
  readonly analytics_retention_days: number;
  readonly signup_enabled: boolean;
  readonly session_timeout_hours: number;
  readonly password_min_length: number;
  readonly global_rate_limit_rpm: number;
  readonly global_rate_limit_rpd: number;
  readonly max_request_body_size_gb: number;
  readonly request_timeout_seconds: number;
  readonly default_max_tokens: number;
  readonly log_request_bodies: boolean;
  readonly log_response_bodies: boolean;
  readonly webhook_timeout_seconds: number;
  readonly webhook_retry_count: number;
  readonly email_notifications_enabled: boolean;
  readonly knowledge_enabled: boolean;
  readonly bigrag_url: string;
  readonly bigrag_api_key: string;
  readonly notify_on_budget_exceeded: boolean;
  readonly notify_on_provider_error_spike: boolean;
}

const DEFAULTS: Record<string, string> = {
  analytics_retention_days: "365",
  bigrag_api_key: "",
  bigrag_url: "",
  default_max_tokens: "4096",
  email_notifications_enabled: "false",
  global_rate_limit_rpd: "1000",
  global_rate_limit_rpm: "60",
  instance_name: "Raven",
  instance_url: "",
  knowledge_enabled: "false",
  log_request_bodies: "true",
  log_response_bodies: "false",
  max_request_body_size_gb: "1",
  notify_on_budget_exceeded: "true",
  notify_on_provider_error_spike: "true",
  password_min_length: "8",
  request_timeout_seconds: "300",
  session_timeout_hours: "24",
  signup_enabled: "true",
  webhook_retry_count: "3",
  webhook_timeout_seconds: "10"
};

const CACHE_KEY = "instance:settings";

const toBool = (v: string | undefined): boolean => v === "true";
const toNum = (v: string | undefined, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const parse = (raw: Record<string, string>): InstanceSettings => ({
  analytics_retention_days: toNum(raw.analytics_retention_days, 365),
  bigrag_api_key: raw.bigrag_api_key || "",
  bigrag_url: raw.bigrag_url || "",
  default_max_tokens: toNum(raw.default_max_tokens, 4096),
  email_notifications_enabled: toBool(raw.email_notifications_enabled),
  global_rate_limit_rpd: toNum(raw.global_rate_limit_rpd, 1000),
  global_rate_limit_rpm: toNum(raw.global_rate_limit_rpm, 60),
  instance_name: raw.instance_name || "Raven",
  instance_url: raw.instance_url || "",
  knowledge_enabled: toBool(raw.knowledge_enabled),
  log_request_bodies: toBool(raw.log_request_bodies),
  log_response_bodies: toBool(raw.log_response_bodies),
  max_request_body_size_gb: toNum(raw.max_request_body_size_gb, 1),
  notify_on_budget_exceeded: toBool(raw.notify_on_budget_exceeded),
  notify_on_provider_error_spike: toBool(raw.notify_on_provider_error_spike),
  password_min_length: toNum(raw.password_min_length, 8),
  request_timeout_seconds: toNum(raw.request_timeout_seconds, 300),
  session_timeout_hours: toNum(raw.session_timeout_hours, 24),
  signup_enabled: toBool(raw.signup_enabled),
  webhook_retry_count: toNum(raw.webhook_retry_count, 3),
  webhook_timeout_seconds: toNum(raw.webhook_timeout_seconds, 10)
});

export const getInstanceSettings = async (
  db: Database,
  redis?: Redis
): Promise<InstanceSettings> => {
  if (redis) {
    const cached = await redis.get(CACHE_KEY).catch(() => null);
    if (cached) return JSON.parse(cached) as InstanceSettings;
  }

  const rows = await db.select().from(settings);
  const raw = { ...DEFAULTS };
  for (const row of rows) {
    if (row.key in DEFAULTS) raw[row.key] = row.value;
  }

  const parsed = parse(raw);

  if (redis) {
    await redis.set(CACHE_KEY, JSON.stringify(parsed)).catch(() => undefined);
  }

  return parsed;
};

/** Invalidate the cached settings (call after admin updates settings) */
export const invalidateSettingsCache = async (redis: Redis): Promise<void> => {
  await redis.del(CACHE_KEY).catch(() => undefined);
};
