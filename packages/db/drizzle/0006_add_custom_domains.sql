CREATE TYPE "domain_status" AS ENUM ('pending_verification', 'verified', 'active', 'failed');

CREATE TABLE "custom_domains" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "domain" text NOT NULL UNIQUE,
  "verification_token" text NOT NULL,
  "status" "domain_status" DEFAULT 'pending_verification' NOT NULL,
  "cloudflare_hostname_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "verified_at" timestamp with time zone
);
