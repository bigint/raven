import { createId } from "@paralleldrive/cuid2";
import {
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

export const evaluationStatusEnum = pgEnum("evaluation_status", [
  "pending",
  "running",
  "completed",
  "failed"
]);

export const evaluations = pgTable(
  "evaluations",
  {
    completedAt: timestamp("completed_at", { withTimezone: true }),
    config: jsonb("config")
      .notNull()
      .$type<Record<string, unknown>>()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: text("created_by").notNull(),
    description: text("description").default(""),
    evaluatorType: text("evaluator_type").notNull(),
    failCount: integer("fail_count").notNull().default(0),
    id: text("id").primaryKey().$defaultFn(createId),
    model: text("model").notNull(),
    name: text("name").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    passCount: integer("pass_count").notNull().default(0),
    results: jsonb("results").$type<Record<string, unknown>>(),
    sampleCount: integer("sample_count").notNull().default(0),
    score: numeric("score", { precision: 5, scale: 4 }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    status: evaluationStatusEnum("status").notNull().default("pending"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (t) => [
    index("evaluations_org_idx").on(t.organizationId),
    index("evaluations_status_idx").on(t.status)
  ]
);

export const evaluationResults = pgTable(
  "evaluation_results",
  {
    actualOutput: text("actual_output"),
    cost: numeric("cost", { precision: 10, scale: 6 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    evaluationId: text("evaluation_id")
      .notNull()
      .references(() => evaluations.id, { onDelete: "cascade" }),
    expectedOutput: text("expected_output"),
    feedback: text("feedback"),
    id: text("id").primaryKey().$defaultFn(createId),
    input: text("input").notNull(),
    latencyMs: integer("latency_ms"),
    metrics: jsonb("metrics").$type<Record<string, number>>().default({}),
    passed: text("passed"),
    score: numeric("score", { precision: 5, scale: 4 }),
    tokenCount: integer("token_count")
  },
  (t) => [index("evaluation_results_eval_idx").on(t.evaluationId)]
);
