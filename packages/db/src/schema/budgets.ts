import { createId } from "@paralleldrive/cuid2";
import {
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const budgetEntityTypeEnum = pgEnum("budget_entity_type", [
  "organization",
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
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    period: budgetPeriodEnum("period").notNull().default("monthly"),
    periodStart: timestamp("period_start", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (t) => [index("budgets_org_entity_idx").on(t.organizationId, t.entityId)]
);
