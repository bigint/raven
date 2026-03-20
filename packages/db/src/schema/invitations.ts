import { createId } from "@paralleldrive/cuid2";
import { index, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./users";

export const invitations = pgTable(
  "invitations",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    email: text("email").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    id: text("id").primaryKey().$defaultFn(createId),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"),
    status: text("status").notNull().default("pending")
  },
  (t) => [
    unique("invitations_org_email_unique").on(t.organizationId, t.email),
    index("invitations_email_status_idx").on(t.email, t.status),
    index("invitations_expires_at_idx").on(t.expiresAt)
  ]
);
