import { createId } from "@paralleldrive/cuid2";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { teams } from "./teams";

export const keyEnvironmentEnum = pgEnum("key_environment", ["live", "test"]);

export const virtualKeys = pgTable("virtual_keys", {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  environment: keyEnvironmentEnum("environment").notNull().default("live"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  id: text("id").primaryKey().$defaultFn(createId),
  isActive: boolean("is_active").notNull().default(true),
  keyHash: text("key_hash").notNull().unique(),
  keyPrefix: text("key_prefix").notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  name: text("name").notNull(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  rateLimitRpd: integer("rate_limit_rpd"),
  rateLimitRpm: integer("rate_limit_rpm"),
  teamId: text("team_id").references(() => teams.id, { onDelete: "set null" })
});
