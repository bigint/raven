import { createId } from "@paralleldrive/cuid2";
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const complianceFrameworks = pgTable(
  "compliance_frameworks",
  {
    controls: jsonb("controls")
      .notNull()
      .$type<
        Array<{
          id: string;
          name: string;
          description: string;
          category: string;
        }>
      >()
      .default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    description: text("description").default(""),
    id: text("id").primaryKey().$defaultFn(createId),
    isEnabled: boolean("is_enabled").notNull().default(true),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    name: text("name").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    version: text("version").notNull()
  },
  (t) => [index("compliance_frameworks_org_idx").on(t.organizationId)]
);
