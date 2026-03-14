import { createId } from "@paralleldrive/cuid2";
import { index, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const domainStatusEnum = pgEnum("domain_status", [
  "pending_verification",
  "verified",
  "active",
  "failed"
]);

export const customDomains = pgTable(
  "custom_domains",
  {
    cloudflareHostnameId: text("cloudflare_hostname_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    domain: text("domain").notNull().unique(),
    id: text("id").primaryKey().$defaultFn(createId),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    status: domainStatusEnum("status")
      .notNull()
      .default("pending_verification"),
    verificationToken: text("verification_token").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true })
  },
  (t) => [index("custom_domains_domain_status_idx").on(t.domain, t.status)]
);
