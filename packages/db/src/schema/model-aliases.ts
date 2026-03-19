import { createId } from "@paralleldrive/cuid2";
import { index, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const modelAliases = pgTable(
  "model_aliases",
  {
    alias: text("alias").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    id: text("id").primaryKey().$defaultFn(createId),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    targetModel: text("target_model").notNull()
  },
  (t) => [
    unique("model_aliases_alias_org_unique").on(t.alias, t.organizationId),
    index("model_aliases_org_idx").on(t.organizationId)
  ]
);
