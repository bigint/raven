import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const syncedProviders = pgTable("synced_providers", {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  isEnabled: boolean("is_enabled").notNull().default(true),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  name: text("name").notNull(),
  slug: text("slug").primaryKey(), // e.g., "openai", "anthropic"
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
});
