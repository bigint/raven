import { createId } from "@paralleldrive/cuid2";
import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const pluginHookEnum = pgEnum("plugin_hook", [
  "pre_request",
  "post_response",
  "on_error",
  "on_stream"
]);

export const plugins = pgTable(
  "plugins",
  {
    code: text("code"),
    config: jsonb("config").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    description: text("description").default(""),
    hooks: jsonb("hooks").notNull().$type<string[]>().default([]),
    id: text("id").primaryKey().$defaultFn(createId),
    isEnabled: boolean("is_enabled").notNull().default(true),
    isOfficial: boolean("is_official").notNull().default(false),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    name: text("name").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    version: text("version").notNull().default("1.0.0")
  },
  (t) => [index("plugins_org_idx").on(t.organizationId)]
);
