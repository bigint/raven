import { createId } from "@paralleldrive/cuid2";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const mcpServerStatusEnum = pgEnum("mcp_server_status", [
  "active",
  "inactive",
  "error"
]);

export const mcpServers = pgTable(
  "mcp_servers",
  {
    accessControl: jsonb("access_control")
      .$type<{ allowedKeys: string[]; allowedTeams: string[] }>()
      .default({ allowedKeys: [], allowedTeams: [] }),
    capabilities: jsonb("capabilities").notNull().$type<string[]>().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    description: text("description").default(""),
    healthCheckInterval: integer("health_check_interval").notNull().default(60),
    id: text("id").primaryKey().$defaultFn(createId),
    isEnabled: boolean("is_enabled").notNull().default(true),
    lastHealthCheck: timestamp("last_health_check", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    name: text("name").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    status: mcpServerStatusEnum("status").notNull().default("active"),
    toolCount: integer("tool_count").notNull().default(0),
    transport: text("transport").notNull().default("stdio"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    url: text("url").notNull()
  },
  (t) => [
    index("mcp_servers_org_idx").on(t.organizationId),
    index("mcp_servers_status_idx").on(t.status)
  ]
);
