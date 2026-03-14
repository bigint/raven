import { createId } from "@paralleldrive/cuid2";
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const planEnum = pgEnum("plan", ["free", "pro", "team", "enterprise"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "past_due",
  "cancelled",
  "trialing"
]);

export const subscriptions = pgTable(
  "subscriptions",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    currentPeriodEnd: timestamp("current_period_end", {
      withTimezone: true
    }).notNull(),
    currentPeriodStart: timestamp("current_period_start", {
      withTimezone: true
    }).notNull(),
    id: text("id").primaryKey().$defaultFn(createId),
    lemonSqueezySubscriptionId: text("lemonsqueezy_subscription_id")
      .notNull()
      .unique(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    plan: planEnum("plan").notNull().default("free"),
    seats: integer("seats").notNull().default(1),
    status: subscriptionStatusEnum("status").notNull().default("active"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (t) => [index("subscriptions_org_idx").on(t.organizationId)]
);
