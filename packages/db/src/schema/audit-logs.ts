import { createId } from "@paralleldrive/cuid2";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const auditLogs = pgTable(
  "audit_logs",
  {
    action: text("action").notNull(),
    actorId: text("actor_id").references(() => users.id, {
      onDelete: "set null"
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    id: text("id").primaryKey().$defaultFn(createId),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    resourceId: text("resource_id").notNull(),
    resourceType: text("resource_type").notNull()
  },
  (t) => [
    index("audit_logs_created_idx").on(t.createdAt),
    index("audit_logs_action_idx").on(t.action),
    index("audit_logs_resource_type_idx").on(t.resourceType),
    index("audit_logs_actor_idx").on(t.actorId)
  ]
);
