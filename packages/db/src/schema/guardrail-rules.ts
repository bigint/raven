import { createId } from "@paralleldrive/cuid2";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp
} from "drizzle-orm/pg-core";

export const guardrailTypeEnum = pgEnum("guardrail_type", [
  "block_topics",
  "pii_detection",
  "content_filter",
  "custom_regex"
]);
export const guardrailActionEnum = pgEnum("guardrail_action", [
  "block",
  "warn",
  "log"
]);

export const guardrailRules = pgTable(
  "guardrail_rules",
  {
    action: guardrailActionEnum("action").notNull().default("log"),
    config: jsonb("config").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: text("id").primaryKey().$defaultFn(createId),
    isEnabled: boolean("is_enabled").notNull().default(true),
    name: text("name").notNull(),
    priority: integer("priority").notNull().default(0),
    type: guardrailTypeEnum("type").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (t) => [index("guardrail_rules_enabled_idx").on(t.isEnabled)]
);
