import { createId } from "@paralleldrive/cuid2";
import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const providerConfigs = pgTable("provider_configs", {
  apiKey: text("api_key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  id: text("id").primaryKey().$defaultFn(createId),
  isEnabled: boolean("is_enabled").notNull().default(true),
  name: text("name"),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
}, (t) => [
  index("provider_configs_org_provider_enabled_idx").on(t.organizationId, t.provider, t.isEnabled)
]);
