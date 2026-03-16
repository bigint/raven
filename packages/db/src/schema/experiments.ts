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

export const experimentStatusEnum = pgEnum("experiment_status", [
  "draft",
  "running",
  "paused",
  "completed"
]);

export const experiments = pgTable(
  "experiments",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: text("created_by").notNull(),
    description: text("description").default(""),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    id: text("id").primaryKey().$defaultFn(createId),
    minimumSamples: integer("minimum_samples").notNull().default(1000),
    name: text("name").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    primaryMetric: text("primary_metric").notNull().default("cost"),
    secondaryMetrics: jsonb("secondary_metrics")
      .notNull()
      .$type<string[]>()
      .default([]),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    status: experimentStatusEnum("status").notNull().default("draft"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (t) => [
    index("experiments_org_idx").on(t.organizationId),
    index("experiments_status_idx").on(t.status)
  ]
);

export const experimentVariants = pgTable(
  "experiment_variants",
  {
    config: jsonb("config").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    errorCount: integer("error_count").notNull().default(0),
    experimentId: text("experiment_id")
      .notNull()
      .references(() => experiments.id, { onDelete: "cascade" }),
    id: text("id").primaryKey().$defaultFn(createId),
    model: text("model").notNull(),
    name: text("name").notNull(),
    provider: text("provider"),
    requestCount: integer("request_count").notNull().default(0),
    totalCost: numeric("total_cost", { precision: 12, scale: 6 })
      .notNull()
      .default("0"),
    totalLatencyMs: integer("total_latency_ms").notNull().default(0),
    weight: integer("weight").notNull().default(50)
  },
  (t) => [index("experiment_variants_exp_idx").on(t.experimentId)]
);
