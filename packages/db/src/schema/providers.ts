import { createId } from "@paralleldrive/cuid2";
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp
} from "drizzle-orm/pg-core";

export const providerConfigs = pgTable(
  "provider_configs",
  {
    apiKey: text("api_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: text("id").primaryKey().$defaultFn(createId),
    isEnabled: boolean("is_enabled").notNull().default(true),
    models: jsonb("models").notNull().$type<string[]>().default([]),
    name: text("name"),
    provider: text("provider").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (t) => [
    index("provider_configs_provider_enabled_idx").on(t.provider, t.isEnabled)
  ]
);
