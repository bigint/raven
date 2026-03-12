import { createId } from "@paralleldrive/cuid2";
import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp
} from "drizzle-orm/pg-core";
import { virtualKeys } from "./keys";
import { organizations } from "./organizations";

export const requestLogs = pgTable(
  "request_logs",
  {
    cachedTokens: integer("cached_tokens").notNull().default(0),
    cacheHit: boolean("cache_hit").notNull().default(false),
    cost: numeric("cost", { precision: 12, scale: 6 }).notNull().default("0"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: text("id").primaryKey().$defaultFn(createId),
    inputTokens: integer("input_tokens").notNull().default(0),
    latencyMs: integer("latency_ms").notNull().default(0),
    method: text("method").notNull(),
    model: text("model").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    outputTokens: integer("output_tokens").notNull().default(0),
    path: text("path").notNull(),
    provider: text("provider").notNull(),
    statusCode: integer("status_code").notNull(),
    virtualKeyId: text("virtual_key_id")
      .notNull()
      .references(() => virtualKeys.id, { onDelete: "cascade" })
  },
  (t) => [
    index("request_logs_org_created_idx").on(t.organizationId, t.createdAt)
  ]
);
