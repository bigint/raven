import { createId } from "@paralleldrive/cuid2";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp
} from "drizzle-orm/pg-core";

export const prompts = pgTable(
  "prompts",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: text("id").primaryKey().$defaultFn(createId),
    name: text("name").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (t) => [index("prompts_name_idx").on(t.name)]
);

export const promptVersions = pgTable(
  "prompt_versions",
  {
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: text("id").primaryKey().$defaultFn(createId),
    isActive: boolean("is_active").notNull().default(false),
    model: text("model"),
    promptId: text("prompt_id")
      .notNull()
      .references(() => prompts.id, { onDelete: "cascade" }),
    version: integer("version").notNull()
  },
  (t) => [
    index("prompt_versions_prompt_id_idx").on(t.promptId),
    index("prompt_versions_prompt_active_idx").on(t.promptId, t.isActive)
  ]
);
