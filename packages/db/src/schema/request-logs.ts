import { createId } from "@paralleldrive/cuid2";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp
} from "drizzle-orm/pg-core";
import { virtualKeys } from "./keys";
import { providerConfigs } from "./providers";

export const requestLogs = pgTable(
  "request_logs",
  {
    cachedTokens: integer("cached_tokens").notNull().default(0),
    cacheHit: boolean("cache_hit").notNull().default(false),
    cost: numeric("cost", { precision: 12, scale: 6 }).notNull().default("0"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    endUser: text("end_user"),
    hasImages: boolean("has_images").notNull().default(false),
    hasToolUse: boolean("has_tool_use").notNull().default(false),
    id: text("id").primaryKey().$defaultFn(createId),
    imageCount: integer("image_count").notNull().default(0),
    inputTokens: integer("input_tokens").notNull().default(0),
    isStarred: boolean("is_starred").notNull().default(false),
    latencyMs: integer("latency_ms").notNull().default(0),
    method: text("method").notNull(),
    model: text("model").notNull(),
    outputTokens: integer("output_tokens").notNull().default(0),
    path: text("path").notNull(),
    provider: text("provider").notNull(),
    providerConfigId: text("provider_config_id").references(
      () => providerConfigs.id,
      { onDelete: "set null" }
    ),
    reasoningTokens: integer("reasoning_tokens").notNull().default(0),
    sessionId: text("session_id"),
    statusCode: integer("status_code").notNull(),
    toolCount: integer("tool_count").notNull().default(0),
    toolNames: jsonb("tool_names").$type<string[]>().default([]),
    userAgent: text("user_agent"),
    virtualKeyId: text("virtual_key_id").references(() => virtualKeys.id, {
      onDelete: "set null"
    })
  },
  (t) => [
    index("request_logs_created_idx").on(t.createdAt),
    index("request_logs_key_created_idx").on(t.virtualKeyId, t.createdAt),
    index("request_logs_session_created_idx").on(t.sessionId, t.createdAt),
    index("request_logs_provider_model_created_idx").on(
      t.provider,
      t.model,
      t.createdAt
    ),
    index("request_logs_status_created_idx").on(t.statusCode, t.createdAt),
    index("request_logs_deleted_created_idx").on(t.deletedAt, t.createdAt),
    index("request_logs_model_created_idx").on(t.model, t.createdAt),
    index("request_logs_enduser_created_idx").on(t.endUser, t.createdAt),
    index("request_logs_created_deleted_idx").on(t.createdAt, t.deletedAt)
  ]
);
