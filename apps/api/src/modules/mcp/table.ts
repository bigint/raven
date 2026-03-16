import { createId } from "@paralleldrive/cuid2";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp
} from "drizzle-orm/pg-core";

// Inline table definition; the schema team will create the canonical version in @raven/db
export const mcpServers = pgTable("mcp_servers", {
  accessControl: jsonb("access_control")
    .$type<{ allowedKeys: string[]; allowedTeams: string[] }>()
    .default({ allowedKeys: [], allowedTeams: [] }),
  capabilities: jsonb("capabilities").notNull().$type<string[]>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  description: text("description").default(""),
  healthCheckInterval: integer("health_check_interval").notNull().default(60),
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  isEnabled: boolean("is_enabled").notNull().default(true),
  lastHealthCheck: timestamp("last_health_check", { withTimezone: true }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  name: text("name").notNull(),
  organizationId: text("organization_id").notNull(),
  status: text("status").notNull().default("active"),
  toolCount: integer("tool_count").notNull().default(0),
  transport: text("transport").notNull().default("stdio"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  url: text("url").notNull()
});
