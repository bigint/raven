import { createId } from "@paralleldrive/cuid2";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const catalogItemTypeEnum = pgEnum("catalog_item_type", [
  "model",
  "agent",
  "mcp_server",
  "prompt_template",
  "guardrail_policy"
]);
export const catalogItemStatusEnum = pgEnum("catalog_item_status", [
  "pending_approval",
  "approved",
  "rejected",
  "deprecated"
]);

export const catalogItems = pgTable(
  "catalog_items",
  {
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: text("approved_by"),
    config: jsonb("config")
      .notNull()
      .$type<Record<string, unknown>>()
      .default({}),
    costEstimate: numeric("cost_estimate", { precision: 10, scale: 4 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: text("created_by").notNull(),
    description: text("description").default(""),
    id: text("id").primaryKey().$defaultFn(createId),
    isEnabled: boolean("is_enabled").notNull().default(true),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    name: text("name").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    qualityScore: numeric("quality_score", { precision: 5, scale: 2 }),
    status: catalogItemStatusEnum("status")
      .notNull()
      .default("pending_approval"),
    tags: jsonb("tags").notNull().$type<string[]>().default([]),
    type: catalogItemTypeEnum("type").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    usageCount: integer("usage_count").notNull().default(0),
    version: text("version").notNull().default("1.0.0")
  },
  (t) => [
    index("catalog_items_org_idx").on(t.organizationId),
    index("catalog_items_type_idx").on(t.type),
    index("catalog_items_status_idx").on(t.status)
  ]
);
