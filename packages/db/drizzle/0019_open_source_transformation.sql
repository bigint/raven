-- Drop foreign key constraints referencing organizations first
ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "audit_logs_organization_id_organizations_id_fk";--> statement-breakpoint
ALTER TABLE "budgets" DROP CONSTRAINT IF EXISTS "budgets_organization_id_organizations_id_fk";--> statement-breakpoint
ALTER TABLE "guardrail_rules" DROP CONSTRAINT IF EXISTS "guardrail_rules_organization_id_organizations_id_fk";--> statement-breakpoint
ALTER TABLE "invitations" DROP CONSTRAINT IF EXISTS "invitations_organization_id_organizations_id_fk";--> statement-breakpoint
ALTER TABLE "invitations" DROP CONSTRAINT IF EXISTS "invitations_inviter_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "members" DROP CONSTRAINT IF EXISTS "members_organization_id_organizations_id_fk";--> statement-breakpoint
ALTER TABLE "members" DROP CONSTRAINT IF EXISTS "members_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "prompts" DROP CONSTRAINT IF EXISTS "prompts_organization_id_organizations_id_fk";--> statement-breakpoint
ALTER TABLE "provider_configs" DROP CONSTRAINT IF EXISTS "provider_configs_organization_id_organizations_id_fk";--> statement-breakpoint
ALTER TABLE "request_logs" DROP CONSTRAINT IF EXISTS "request_logs_organization_id_organizations_id_fk";--> statement-breakpoint
ALTER TABLE "routing_rules" DROP CONSTRAINT IF EXISTS "routing_rules_organization_id_organizations_id_fk";--> statement-breakpoint
ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "subscriptions_organization_id_organizations_id_fk";--> statement-breakpoint
ALTER TABLE "virtual_keys" DROP CONSTRAINT IF EXISTS "virtual_keys_organization_id_organizations_id_fk";--> statement-breakpoint
ALTER TABLE "webhooks" DROP CONSTRAINT IF EXISTS "webhooks_organization_id_organizations_id_fk";--> statement-breakpoint

-- Drop tables: invitations, members, subscriptions, organizations
DROP TABLE IF EXISTS "invitations";--> statement-breakpoint
DROP TABLE IF EXISTS "members";--> statement-breakpoint
DROP TABLE IF EXISTS "subscriptions";--> statement-breakpoint
DROP TABLE IF EXISTS "organizations";--> statement-breakpoint

-- Drop enums for removed tables
DROP TYPE IF EXISTS "public"."plan";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."subscription_status";--> statement-breakpoint

-- Remove activeOrganizationId from sessions
ALTER TABLE "sessions" DROP COLUMN IF EXISTS "active_organization_id";--> statement-breakpoint

-- Remove organizationId from all remaining tables and drop old indexes

-- audit_logs: remove org column and org-prefixed indexes
DROP INDEX IF EXISTS "audit_logs_org_created_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "audit_logs_org_action_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "audit_logs_org_resource_type_idx";--> statement-breakpoint
ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "organization_id";--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "actor_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_resource_type_idx" ON "audit_logs" USING btree ("resource_type");--> statement-breakpoint

-- budgets: remove org column, change entity type enum
DROP INDEX IF EXISTS "budgets_org_entity_idx";--> statement-breakpoint
ALTER TABLE "budgets" DROP COLUMN IF EXISTS "organization_id";--> statement-breakpoint
ALTER TYPE "public"."budget_entity_type" RENAME TO "budget_entity_type_old";--> statement-breakpoint
CREATE TYPE "public"."budget_entity_type" AS ENUM('global', 'key');--> statement-breakpoint
ALTER TABLE "budgets" ALTER COLUMN "entity_type" TYPE "public"."budget_entity_type" USING (
  CASE WHEN "entity_type"::text = 'organization' THEN 'global'
  ELSE "entity_type"::text
  END
)::"public"."budget_entity_type";--> statement-breakpoint
DROP TYPE "public"."budget_entity_type_old";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "budgets_entity_idx" ON "budgets" USING btree ("entity_type", "entity_id");--> statement-breakpoint

-- guardrail_rules: remove org column and index
DROP INDEX IF EXISTS "guardrail_rules_org_enabled_idx";--> statement-breakpoint
ALTER TABLE "guardrail_rules" DROP COLUMN IF EXISTS "organization_id";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "guardrail_rules_enabled_idx" ON "guardrail_rules" USING btree ("is_enabled");--> statement-breakpoint

-- virtual_keys: remove org column and index
DROP INDEX IF EXISTS "virtual_keys_org_active_idx";--> statement-breakpoint
ALTER TABLE "virtual_keys" DROP COLUMN IF EXISTS "organization_id";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "virtual_keys_active_idx" ON "virtual_keys" USING btree ("is_active");--> statement-breakpoint

-- prompts: remove org column and index
DROP INDEX IF EXISTS "prompts_org_name_idx";--> statement-breakpoint
ALTER TABLE "prompts" DROP COLUMN IF EXISTS "organization_id";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prompts_name_idx" ON "prompts" USING btree ("name");--> statement-breakpoint

-- provider_configs: remove org column and index
DROP INDEX IF EXISTS "provider_configs_org_provider_enabled_idx";--> statement-breakpoint
ALTER TABLE "provider_configs" DROP COLUMN IF EXISTS "organization_id";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "provider_configs_provider_enabled_idx" ON "provider_configs" USING btree ("provider", "is_enabled");--> statement-breakpoint

-- request_logs: remove org column and all org-prefixed indexes
DROP INDEX IF EXISTS "request_logs_org_created_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "request_logs_org_key_created_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "request_logs_org_session_created_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "request_logs_provider_model_org_created_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "request_logs_org_status_created_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "request_logs_org_deleted_created_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "request_logs_org_model_created_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "request_logs_org_enduser_created_idx";--> statement-breakpoint
ALTER TABLE "request_logs" DROP COLUMN IF EXISTS "organization_id";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "request_logs_created_idx" ON "request_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "request_logs_key_created_idx" ON "request_logs" USING btree ("virtual_key_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "request_logs_session_created_idx" ON "request_logs" USING btree ("session_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "request_logs_provider_model_created_idx" ON "request_logs" USING btree ("provider", "model", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "request_logs_status_created_idx" ON "request_logs" USING btree ("status_code", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "request_logs_deleted_created_idx" ON "request_logs" USING btree ("deleted_at", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "request_logs_model_created_idx" ON "request_logs" USING btree ("model", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "request_logs_enduser_created_idx" ON "request_logs" USING btree ("end_user", "created_at");--> statement-breakpoint

-- routing_rules: remove org column and index
DROP INDEX IF EXISTS "routing_rules_org_model_enabled_idx";--> statement-breakpoint
ALTER TABLE "routing_rules" DROP COLUMN IF EXISTS "organization_id";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "routing_rules_model_enabled_idx" ON "routing_rules" USING btree ("source_model", "is_enabled");--> statement-breakpoint

-- webhooks: remove org column and index
DROP INDEX IF EXISTS "webhooks_org_enabled_idx";--> statement-breakpoint
ALTER TABLE "webhooks" DROP COLUMN IF EXISTS "organization_id";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhooks_enabled_idx" ON "webhooks" USING btree ("is_enabled");--> statement-breakpoint

-- Alter platform_role enum: rename old, create new, migrate data, drop old
ALTER TYPE "public"."platform_role" RENAME TO "platform_role_old";--> statement-breakpoint
CREATE TYPE "public"."platform_role" AS ENUM('admin', 'member', 'viewer');--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."platform_role" USING (
  CASE
    WHEN "role"::text = 'admin' THEN 'admin'
    WHEN "role"::text = 'user' THEN 'viewer'
    ELSE 'viewer'
  END
)::"public"."platform_role";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'viewer'::"public"."platform_role";--> statement-breakpoint
DROP TYPE "public"."platform_role_old";--> statement-breakpoint

-- Create settings table
CREATE TABLE IF NOT EXISTS "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"value" text NOT NULL
);
