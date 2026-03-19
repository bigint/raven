CREATE TYPE "public"."domain_status" AS ENUM('pending_verification', 'verified', 'active', 'failed');--> statement-breakpoint
CREATE TABLE "custom_domains" (
	"cloudflare_hostname_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"domain" text NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"status" "domain_status" DEFAULT 'pending_verification' NOT NULL,
	"verification_token" text NOT NULL,
	"verified_at" timestamp with time zone,
	CONSTRAINT "custom_domains_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE "models" (
	"capabilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"category" text NOT NULL,
	"context_window" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"input_price" numeric(10, 4) DEFAULT '0' NOT NULL,
	"max_output" integer DEFAULT 0 NOT NULL,
	"name" text NOT NULL,
	"output_price" numeric(10, 4) DEFAULT '0' NOT NULL,
	"provider" text NOT NULL,
	"slug" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "models_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "synced_providers" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"last_synced_at" timestamp with time zone,
	"name" text NOT NULL,
	"slug" text PRIMARY KEY NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sso_configs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "sso_configs" CASCADE;--> statement-breakpoint
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_paddle_subscription_id_unique";--> statement-breakpoint
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_actor_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "actor_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "budgets" ALTER COLUMN "alert_threshold" SET DATA TYPE numeric(5, 2);--> statement-breakpoint
ALTER TABLE "budgets" ALTER COLUMN "alert_threshold" SET DEFAULT '0.80';--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "lemonsqueezy_customer_id" text;--> statement-breakpoint
ALTER TABLE "request_logs" ADD COLUMN "reasoning_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "request_logs" ADD COLUMN "tool_names" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "request_logs" ADD COLUMN "user_agent" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "lemonsqueezy_subscription_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "custom_domains" ADD CONSTRAINT "custom_domains_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "models" ADD CONSTRAINT "models_provider_synced_providers_slug_fk" FOREIGN KEY ("provider") REFERENCES "public"."synced_providers"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "custom_domains_domain_status_idx" ON "custom_domains" USING btree ("domain","status");--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_org_action_idx" ON "audit_logs" USING btree ("organization_id","action");--> statement-breakpoint
CREATE INDEX "audit_logs_org_resource_type_idx" ON "audit_logs" USING btree ("organization_id","resource_type");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "budgets_org_entity_idx" ON "budgets" USING btree ("organization_id","entity_id");--> statement-breakpoint
CREATE INDEX "guardrail_rules_org_enabled_idx" ON "guardrail_rules" USING btree ("organization_id","is_enabled");--> statement-breakpoint
CREATE INDEX "members_user_idx" ON "members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "prompt_versions_prompt_id_idx" ON "prompt_versions" USING btree ("prompt_id");--> statement-breakpoint
CREATE INDEX "prompts_org_name_idx" ON "prompts" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "provider_configs_org_provider_enabled_idx" ON "provider_configs" USING btree ("organization_id","provider","is_enabled");--> statement-breakpoint
CREATE INDEX "request_logs_org_key_created_idx" ON "request_logs" USING btree ("organization_id","virtual_key_id","created_at");--> statement-breakpoint
CREATE INDEX "request_logs_org_session_created_idx" ON "request_logs" USING btree ("organization_id","session_id","created_at");--> statement-breakpoint
CREATE INDEX "request_logs_provider_model_org_created_idx" ON "request_logs" USING btree ("provider","model","organization_id","created_at");--> statement-breakpoint
CREATE INDEX "request_logs_org_status_created_idx" ON "request_logs" USING btree ("organization_id","status_code","created_at");--> statement-breakpoint
CREATE INDEX "routing_rules_org_model_enabled_idx" ON "routing_rules" USING btree ("organization_id","source_model","is_enabled");--> statement-breakpoint
CREATE INDEX "subscriptions_org_idx" ON "subscriptions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "teams_org_idx" ON "teams" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "virtual_keys_key_hash_idx" ON "virtual_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "virtual_keys_org_active_idx" ON "virtual_keys" USING btree ("organization_id","is_active");--> statement-breakpoint
CREATE INDEX "webhooks_org_enabled_idx" ON "webhooks" USING btree ("organization_id","is_enabled");--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "paddle_customer_id";--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN "paddle_subscription_id";--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_lemonsqueezy_subscription_id_unique" UNIQUE("lemonsqueezy_subscription_id");--> statement-breakpoint
DROP TYPE "public"."sso_provider";