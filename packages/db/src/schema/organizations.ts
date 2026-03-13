import { createId } from "@paralleldrive/cuid2";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const organizations = pgTable("organizations", {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  id: text("id").primaryKey().$defaultFn(createId),
  lemonSqueezyCustomerId: text("lemonsqueezy_customer_id"),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
});
