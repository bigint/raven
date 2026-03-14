import { createId } from "@paralleldrive/cuid2";
import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const webhooks = pgTable(
  "webhooks",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    events: text("events").array().notNull(),
    id: text("id").primaryKey().$defaultFn(createId),
    isEnabled: boolean("is_enabled").notNull().default(true),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    secret: text("secret").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    url: text("url").notNull()
  },
  (t) => [index("webhooks_org_enabled_idx").on(t.organizationId, t.isEnabled)]
);
