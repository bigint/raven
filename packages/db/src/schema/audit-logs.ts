import { createId } from "@paralleldrive/cuid2";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./users";

export const auditLogs = pgTable(
  "audit_logs",
  {
    action: text("action").notNull(),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: text("id").primaryKey().$defaultFn(createId),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    resourceId: text("resource_id").notNull(),
    resourceType: text("resource_type").notNull()
  },
  (t) => [index("audit_logs_org_created_idx").on(t.organizationId, t.createdAt)]
);
