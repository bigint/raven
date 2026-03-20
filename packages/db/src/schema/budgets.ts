import { createId } from "@paralleldrive/cuid2";
import {
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp
} from "drizzle-orm/pg-core";

export const budgetEntityTypeEnum = pgEnum("budget_entity_type", [
  "global",
  "key"
]);
export const budgetPeriodEnum = pgEnum("budget_period", ["daily", "monthly"]);

export const budgets = pgTable(
  "budgets",
  {
    alertThreshold: numeric("alert_threshold", { precision: 5, scale: 2 })
      .notNull()
      .default("0.80"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    entityId: text("entity_id").notNull(),
    entityType: budgetEntityTypeEnum("entity_type").notNull(),
    id: text("id").primaryKey().$defaultFn(createId),
    limitAmount: numeric("limit_amount", { precision: 12, scale: 2 }).notNull(),
    period: budgetPeriodEnum("period").notNull().default("monthly")
  },
  (t) => [index("budgets_entity_idx").on(t.entityType, t.entityId)]
);
