CREATE TYPE "public"."budget_entity_type" AS ENUM('global', 'key');--> statement-breakpoint
CREATE TYPE "public"."budget_period" AS ENUM('daily', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."guardrail_action" AS ENUM('block', 'warn', 'log');--> statement-breakpoint
CREATE TYPE "public"."guardrail_type" AS ENUM('block_topics', 'pii_detection', 'content_filter', 'custom_regex');--> statement-breakpoint
CREATE TYPE "public"."key_environment" AS ENUM('live', 'test');--> statement-breakpoint
CREATE TYPE "public"."platform_role" AS ENUM('admin', 'member', 'viewer');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"action" text NOT NULL,
	"actor_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"id" text PRIMARY KEY NOT NULL,
	"metadata" jsonb,
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
	"alert_threshold" numeric(5, 2) DEFAULT '0.80' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"entity_id" text NOT NULL,
	"entity_type" "budget_entity_type" NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"limit_amount" numeric(12, 2) NOT NULL,
	"period" "budget_period" DEFAULT 'monthly' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guardrail_rules" (
	"action" "guardrail_action" DEFAULT 'log' NOT NULL,
	"config" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"name" text NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"type" "guardrail_type" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"email" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"invited_by" text NOT NULL,
	"role" "platform_role" DEFAULT 'member' NOT NULL,
	"token" text NOT NULL,
	CONSTRAINT "invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "provider_configs" (
	"api_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"models" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"name" text,
	"provider" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "request_logs" (
	"cached_tokens" integer DEFAULT 0 NOT NULL,
	"cache_hit" boolean DEFAULT false NOT NULL,
	"cost" numeric(12, 6) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"end_user" text,
	"has_images" boolean DEFAULT false NOT NULL,
	"has_tool_use" boolean DEFAULT false NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"image_count" integer DEFAULT 0 NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"is_starred" boolean DEFAULT false NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"method" text NOT NULL,
	"model" text NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"path" text NOT NULL,
	"provider" text NOT NULL,
	"provider_config_id" text,
	"reasoning_tokens" integer DEFAULT 0 NOT NULL,
	"session_id" text,
	"status_code" integer NOT NULL,
	"tool_count" integer DEFAULT 0 NOT NULL,
	"tool_names" jsonb DEFAULT '[]'::jsonb,
	"user_agent" text,
	"virtual_key_id" text
);
--> statement-breakpoint
CREATE TABLE "routing_rules" (
	"condition" text NOT NULL,
	"condition_value" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"name" text NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"source_model" text NOT NULL,
	"target_model" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"role" "platform_role" DEFAULT 'viewer' NOT NULL,
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
	"rate_limit_rpd" integer,
	"rate_limit_rpm" integer,
	CONSTRAINT "virtual_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "webhooks" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"events" text[] NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"secret" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"url" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_logs" ADD CONSTRAINT "request_logs_provider_config_id_provider_configs_id_fk" FOREIGN KEY ("provider_config_id") REFERENCES "public"."provider_configs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_logs" ADD CONSTRAINT "request_logs_virtual_key_id_virtual_keys_id_fk" FOREIGN KEY ("virtual_key_id") REFERENCES "public"."virtual_keys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_resource_type_idx" ON "audit_logs" USING btree ("resource_type");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "verifications_expires_at_idx" ON "verifications" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "budgets_entity_idx" ON "budgets" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "guardrail_rules_enabled_idx" ON "guardrail_rules" USING btree ("is_enabled");--> statement-breakpoint
CREATE INDEX "provider_configs_provider_enabled_idx" ON "provider_configs" USING btree ("provider","is_enabled");--> statement-breakpoint
CREATE INDEX "request_logs_created_idx" ON "request_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "request_logs_key_created_idx" ON "request_logs" USING btree ("virtual_key_id","created_at");--> statement-breakpoint
CREATE INDEX "request_logs_session_created_idx" ON "request_logs" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "request_logs_provider_model_created_idx" ON "request_logs" USING btree ("provider","model","created_at");--> statement-breakpoint
CREATE INDEX "request_logs_status_created_idx" ON "request_logs" USING btree ("status_code","created_at");--> statement-breakpoint
CREATE INDEX "request_logs_deleted_created_idx" ON "request_logs" USING btree ("deleted_at","created_at");--> statement-breakpoint
CREATE INDEX "request_logs_model_created_idx" ON "request_logs" USING btree ("model","created_at");--> statement-breakpoint
CREATE INDEX "request_logs_enduser_created_idx" ON "request_logs" USING btree ("end_user","created_at");--> statement-breakpoint
CREATE INDEX "request_logs_created_deleted_idx" ON "request_logs" USING btree ("created_at","deleted_at");--> statement-breakpoint
CREATE INDEX "routing_rules_model_enabled_idx" ON "routing_rules" USING btree ("source_model","is_enabled");--> statement-breakpoint
CREATE INDEX "virtual_keys_key_hash_idx" ON "virtual_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "virtual_keys_active_idx" ON "virtual_keys" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "webhooks_enabled_idx" ON "webhooks" USING btree ("is_enabled");