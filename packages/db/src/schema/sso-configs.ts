import { createId } from "@paralleldrive/cuid2";
import { boolean, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const ssoProviderEnum = pgEnum("sso_provider", ["saml", "oidc"]);

export const ssoConfigs = pgTable("sso_configs", {
  certificate: text("certificate").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  id: text("id").primaryKey().$defaultFn(createId),
  isEnabled: boolean("is_enabled").notNull().default(false),
  issuerUrl: text("issuer_url").notNull(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" })
    .unique(),
  provider: ssoProviderEnum("provider").notNull(),
  ssoUrl: text("sso_url").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
});
