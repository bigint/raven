import { createId } from "@paralleldrive/cuid2";
import { index, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./users";

export const members = pgTable(
  "members",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: text("id").primaryKey().$defaultFn(createId),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
  },
  (t) => [
    unique("members_org_user_unique").on(t.organizationId, t.userId),
    index("members_user_idx").on(t.userId)
  ]
);
