import { createId } from "@paralleldrive/cuid2";
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./users";

export const teamRoleEnum = pgEnum("team_role", ["lead", "member"]);

export const teams = pgTable(
  "teams",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: text("id").primaryKey().$defaultFn(createId),
    name: text("name").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" })
  },
  (t) => [index("teams_org_idx").on(t.organizationId)]
);

export const teamMembers = pgTable(
  "team_members",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: text("id").primaryKey().$defaultFn(createId),
    role: teamRoleEnum("role").notNull().default("member"),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
  },
  (t) => [unique("team_members_team_user_unique").on(t.teamId, t.userId)]
);
