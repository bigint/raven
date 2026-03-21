import { createId } from "@paralleldrive/cuid2";
import { boolean, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const platformRoleEnum = pgEnum("platform_role", [
  "admin",
  "member",
  "viewer"
]);

export const users = pgTable("users", {
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  id: text("id").primaryKey().$defaultFn(createId),
  name: text("name").notNull(),
  role: platformRoleEnum("role").notNull().default("viewer"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
});
