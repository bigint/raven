import { createId } from "@paralleldrive/cuid2";
import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp
} from "drizzle-orm/pg-core";

// Inline table definition; the schema team will create the canonical version in @raven/db
export const agentIdentities = pgTable("agent_identities", {
  budgetMax: numeric("budget_max", { precision: 12, scale: 4 }),
  budgetPeriod: text("budget_period").default("monthly"),
  budgetSpent: numeric("budget_spent", { precision: 12, scale: 4 })
    .notNull()
    .default("0"),
  canDelegate: boolean("can_delegate").notNull().default(false),
  capabilities: jsonb("capabilities")
    .notNull()
    .$type<Record<string, unknown>>()
    .default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdBy: text("created_by").notNull(),
  delegationDepth: integer("delegation_depth").notNull().default(0),
  description: text("description").default(""),
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
  maxDelegationDepth: integer("max_delegation_depth").notNull().default(3),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  name: text("name").notNull(),
  organizationId: text("organization_id").notNull(),
  parentAgentId: text("parent_agent_id"),
  status: text("status").notNull().default("active"),
  type: text("type").notNull().default("autonomous"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  virtualKeyId: text("virtual_key_id")
});
