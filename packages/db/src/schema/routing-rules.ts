import { createId } from "@paralleldrive/cuid2";
import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const routingRules = pgTable("routing_rules", {
  condition: text("condition").notNull(),
  conditionValue: text("condition_value").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  id: text("id").primaryKey().$defaultFn(createId),
  isEnabled: boolean("is_enabled").notNull().default(true),
  name: text("name").notNull(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  priority: integer("priority").notNull().default(0),
  sourceModel: text("source_model").notNull(),
  targetModel: text("target_model").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
});
