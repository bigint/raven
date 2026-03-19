CREATE TYPE "public"."budget_entity_type" AS ENUM('organization', 'team', 'key');--> statement-breakpoint
CREATE TYPE "public"."budget_period" AS ENUM('daily', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."guardrail_action" AS ENUM('block', 'warn', 'log');--> statement-breakpoint
CREATE TYPE "public"."guardrail_type" AS ENUM('block_topics', 'pii_detection', 'content_filter', 'custom_regex');--> statement-breakpoint
CREATE TYPE "public"."key_environment" AS ENUM('live', 'test');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('free', 'pro', 'team', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."platform_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."sso_provider" AS ENUM('saml', 'oidc');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'past_due', 'cancelled', 'trialing');--> statement-breakpoint
CREATE TYPE "public"."team_role" AS ENUM('lead', 'member');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"action" text NOT NULL,
	"actor_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"metadata" jsonb,
	"organization_id" text NOT NULL,
	"resource_id" text NOT NULL,
	"resource_type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"access_token" text,
	"access_token_expires_at" timestamp with time zone,
	"account_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"id_token" text,
	"password" text,
	"provider_id" text NOT NULL,
	"refresh_token" text,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"active_organization_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"ip_address" text,
	"token" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"alert_threshold" numeric(3, 2) DEFAULT '0.80' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"entity_id" text NOT NULL,
	"entity_type" "budget_entity_type" NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"limit_amount" numeric(12, 2) NOT NULL,
	"organization_id" text NOT NULL,
	"period" "budget_period" DEFAULT 'monthly' NOT NULL,
	"period_start" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guardrail_rules" (
	"action" "guardrail_action" DEFAULT 'log' NOT NULL,
	"config" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"name" text NOT NULL,
	"organization_id" text NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"type" "guardrail_type" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"email" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"inviter_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	CONSTRAINT "invitations_org_email_unique" UNIQUE("organization_id","email")
);
--> statement-breakpoint
CREATE TABLE "members" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "members_org_user_unique" UNIQUE("organization_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"paddle_customer_id" text,
	"slug" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "provider_configs" (
	"api_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"name" text,
	"organization_id" text NOT NULL,
	"provider" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "request_logs" (
	"cached_tokens" integer DEFAULT 0 NOT NULL,
	"cache_hit" boolean DEFAULT false NOT NULL,
	"cost" numeric(12, 6) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"method" text NOT NULL,
	"model" text NOT NULL,
	"organization_id" text NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"path" text NOT NULL,
	"provider" text NOT NULL,
	"provider_config_id" text,
	"status_code" integer NOT NULL,
	"virtual_key_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sso_configs" (
	"certificate" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"issuer_url" text NOT NULL,
	"organization_id" text NOT NULL,
	"provider" "sso_provider" NOT NULL,
	"sso_url" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sso_configs_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"current_period_end" timestamp with time zone NOT NULL,
	"current_period_start" timestamp with time zone NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"paddle_subscription_id" text NOT NULL,
	"plan" "plan" DEFAULT 'free' NOT NULL,
	"seats" integer DEFAULT 1 NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_paddle_subscription_id_unique" UNIQUE("paddle_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"role" "team_role" DEFAULT 'member' NOT NULL,
	"team_id" text NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "team_members_team_user_unique" UNIQUE("team_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"organization_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"role" "platform_role" DEFAULT 'user' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "virtual_keys" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"environment" "key_environment" DEFAULT 'live' NOT NULL,
	"expires_at" timestamp with time zone,
	"id" text PRIMARY KEY NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"last_used_at" timestamp with time zone,
	"name" text NOT NULL,
	"organization_id" text NOT NULL,
	"rate_limit_rpd" integer,
	"rate_limit_rpm" integer,
	"team_id" text,
	CONSTRAINT "virtual_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardrail_rules" ADD CONSTRAINT "guardrail_rules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_inviter_id_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_configs" ADD CONSTRAINT "provider_configs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_logs" ADD CONSTRAINT "request_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_logs" ADD CONSTRAINT "request_logs_provider_config_id_provider_configs_id_fk" FOREIGN KEY ("provider_config_id") REFERENCES "public"."provider_configs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_logs" ADD CONSTRAINT "request_logs_virtual_key_id_virtual_keys_id_fk" FOREIGN KEY ("virtual_key_id") REFERENCES "public"."virtual_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sso_configs" ADD CONSTRAINT "sso_configs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "virtual_keys" ADD CONSTRAINT "virtual_keys_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "virtual_keys" ADD CONSTRAINT "virtual_keys_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_org_created_idx" ON "audit_logs" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "request_logs_org_created_idx" ON "request_logs" USING btree ("organization_id","created_at");