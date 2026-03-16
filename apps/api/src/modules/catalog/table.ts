import { createId } from "@paralleldrive/cuid2";
import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Inline table definition; the schema team will create the canonical version in @raven/db
export const catalogItems = pgTable("catalog_items", {
  config: jsonb("config").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  description: text("description").default(""),
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  name: text("name").notNull(),
  organizationId: text("organization_id").notNull(),
  rejectionReason: text("rejection_reason"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewedBy: text("reviewed_by"),
  status: text("status").notNull().default("pending"),
  submittedBy: text("submitted_by").notNull(),
  tags: jsonb("tags").notNull().$type<string[]>().default([]),
  type: text("type").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  version: text("version").default("1.0.0")
});
