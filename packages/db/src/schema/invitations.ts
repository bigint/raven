import { createId } from "@paralleldrive/cuid2";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { platformRoleEnum } from "./users";

export const invitations = pgTable("invitations", {
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  email: text("email").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  id: text("id").primaryKey().$defaultFn(createId),
  invitedBy: text("invited_by").notNull(),
  role: platformRoleEnum("role").notNull().default("member"),
  token: text("token").notNull().unique()
});
