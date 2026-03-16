import { createId } from "@paralleldrive/cuid2";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const policyScopeEnum = pgEnum("policy_scope", [
  "platform",
  "organization",
  "team",
  "key"
]);
export const policyStatusEnum = pgEnum("policy_status", [
  "active",
  "draft",
  "archived"
]);
export const ruleTypeEnum = pgEnum("rule_type", [
  "deterministic",
  "statistical",
  "ml_model"
]);
export const ruleEnforcementEnum = pgEnum("rule_enforcement", [
  "block",
  "warn",
  "log",
  "redact",
  "alert"
]);

export const policies = pgTable(
  "policies",
  {
    complianceFrameworks: jsonb("compliance_frameworks")
      .notNull()
      .$type<string[]>()
      .default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: text("created_by").notNull(),
    description: text("description").default(""),
    id: text("id").primaryKey().$defaultFn(createId),
    isEnabled: boolean("is_enabled").notNull().default(true),
    name: text("name").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    scope: policyScopeEnum("scope").notNull().default("organization"),
    scopeId: text("scope_id"),
    status: policyStatusEnum("status").notNull().default("draft"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    version: integer("version").notNull().default(1)
  },
  (t) => [
    index("policies_org_idx").on(t.organizationId),
    index("policies_scope_idx").on(t.scope, t.scopeId)
  ]
);

export const policyRules = pgTable(
  "policy_rules",
  {
    complianceMap: jsonb("compliance_map")
      .notNull()
      .$type<Record<string, string>>()
      .default({}),
    condition: jsonb("condition").notNull().$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    description: text("description").default(""),
    enforcement: ruleEnforcementEnum("enforcement").notNull(),
    evidenceConfig: jsonb("evidence_config")
      .$type<Record<string, unknown>>()
      .default({}),
    id: text("id").primaryKey().$defaultFn(createId),
    isEnabled: boolean("is_enabled").notNull().default(true),
    name: text("name").notNull(),
    policyId: text("policy_id")
      .notNull()
      .references(() => policies.id, { onDelete: "cascade" }),
    priority: integer("priority").notNull().default(0),
    type: ruleTypeEnum("type").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (t) => [index("policy_rules_policy_idx").on(t.policyId)]
);

export const policyEvaluations = pgTable(
  "policy_evaluations",
  {
    complianceControl: text("compliance_control"),
    complianceFramework: text("compliance_framework"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    enforcement: text("enforcement").notNull(),
    evidence: jsonb("evidence").$type<Record<string, unknown>>(),
    id: text("id").primaryKey().$defaultFn(createId),
    matched: boolean("matched").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    policyId: text("policy_id").notNull(),
    requestId: text("request_id").notNull(),
    ruleId: text("rule_id").notNull()
  },
  (t) => [
    index("policy_evals_org_idx").on(t.organizationId),
    index("policy_evals_request_idx").on(t.requestId)
  ]
);
