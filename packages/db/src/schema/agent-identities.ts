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

export const agentStatusEnum = pgEnum("agent_status", [
  "active",
  "suspended",
  "revoked"
]);
export const agentTypeEnum = pgEnum("agent_type", [
  "autonomous",
  "semi_autonomous",
  "tool"
]);

export const agentIdentities = pgTable(
  "agent_identities",
  {
    budgetMax: numeric("budget_max", { precision: 12, scale: 4 }),
    budgetPeriod: text("budget_period").default("monthly"),
    budgetSpent: numeric("budget_spent", { precision: 12, scale: 4 })
      .notNull()
      .default("0"),
    canDelegate: boolean("can_delegate").notNull().default(false),
    capabilities: jsonb("capabilities")
      .notNull()
      .$type<{
        allowedModels: string[];
        allowedTools: string[];
        maxConcurrentRequests: number;
        maxTokensPerRequest: number;
        maxCostPerRequest: number;
      }>()
      .default({
        allowedModels: [],
        allowedTools: [],
        maxConcurrentRequests: 10,
        maxCostPerRequest: 1.0,
        maxTokensPerRequest: 100000
      }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: text("created_by").notNull(),
    delegationDepth: integer("delegation_depth").notNull().default(0),
    description: text("description").default(""),
    id: text("id").primaryKey().$defaultFn(createId),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
    maxDelegationDepth: integer("max_delegation_depth").notNull().default(3),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    name: text("name").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    parentAgentId: text("parent_agent_id"),
    status: agentStatusEnum("status").notNull().default("active"),
    type: agentTypeEnum("type").notNull().default("autonomous"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    virtualKeyId: text("virtual_key_id")
  },
  (t) => [
    index("agent_identities_org_idx").on(t.organizationId),
    index("agent_identities_status_idx").on(t.status),
    index("agent_identities_parent_idx").on(t.parentAgentId)
  ]
);
