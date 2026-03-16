import {
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp
} from "drizzle-orm/pg-core";

export const models = pgTable(
  "models",
  {
    capabilities: jsonb("capabilities").notNull().$type<string[]>().default([]),
    category: text("category").notNull(), // flagship, balanced, fast, reasoning, embedding
    contextWindow: integer("context_window").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    description: text("description").notNull().default(""),
    id: text("id").primaryKey(), // e.g. "openai/gpt-5"
    inputPrice: numeric("input_price", { precision: 10, scale: 4 })
      .notNull()
      .default("0"),
    maxOutput: integer("max_output").notNull().default(0),
    name: text("name").notNull(),
    outputPrice: numeric("output_price", { precision: 10, scale: 4 })
      .notNull()
      .default("0"),
    provider: text("provider").notNull(),
    slug: text("slug").notNull().unique(), // Short ID e.g. "gpt-5"
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (t) => [index("models_provider_idx").on(t.provider)]
);
