CREATE TYPE "public"."agent_status" AS ENUM('active', 'suspended', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."agent_type" AS ENUM('autonomous', 'semi_autonomous', 'tool');--> statement-breakpoint
CREATE TYPE "public"."catalog_item_status" AS ENUM('pending_approval', 'approved', 'rejected', 'deprecated');--> statement-breakpoint
CREATE TYPE "public"."catalog_item_type" AS ENUM('model', 'agent', 'mcp_server', 'prompt_template', 'guardrail_policy');--> statement-breakpoint
CREATE TYPE "public"."evaluation_status" AS ENUM('pending', 'running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."experiment_status" AS ENUM('draft', 'running', 'paused', 'completed');--> statement-breakpoint
CREATE TYPE "public"."mcp_server_status" AS ENUM('active', 'inactive', 'error');--> statement-breakpoint
CREATE TYPE "public"."plugin_hook" AS ENUM('pre_request', 'post_response', 'on_error', 'on_stream');--> statement-breakpoint
CREATE TYPE "public"."policy_scope" AS ENUM('platform', 'organization', 'team', 'key');--> statement-breakpoint
CREATE TYPE "public"."policy_status" AS ENUM('active', 'draft', 'archived');--> statement-breakpoint
CREATE TYPE "public"."rule_enforcement" AS ENUM('block', 'warn', 'log', 'redact', 'alert');--> statement-breakpoint
CREATE TYPE "public"."rule_type" AS ENUM('deterministic', 'statistical', 'ml_model');--> statement-breakpoint
CREATE TABLE "agent_identities" (
	"budget_max" numeric(12, 4),
	"budget_period" text DEFAULT 'monthly',
	"budget_spent" numeric(12, 4) DEFAULT '0' NOT NULL,
	"can_delegate" boolean DEFAULT false NOT NULL,
	"capabilities" jsonb DEFAULT '{"allowedModels":[],"allowedTools":[],"maxConcurrentRequests":10,"maxTokensPerRequest":100000,"maxCostPerRequest":1}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"delegation_depth" integer DEFAULT 0 NOT NULL,
	"description" text DEFAULT '',
	"id" text PRIMARY KEY NOT NULL,
	"last_active_at" timestamp with time zone,
	"max_delegation_depth" integer DEFAULT 3 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"name" text NOT NULL,
	"organization_id" text NOT NULL,
	"parent_agent_id" text,
	"status" "agent_status" DEFAULT 'active' NOT NULL,
	"type" "agent_type" DEFAULT 'autonomous' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"virtual_key_id" text
);
--> statement-breakpoint
CREATE TABLE "catalog_items" (
	"approved_at" timestamp with time zone,
	"approved_by" text,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"cost_estimate" numeric(10, 4),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"description" text DEFAULT '',
	"id" text PRIMARY KEY NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"name" text NOT NULL,
	"organization_id" text NOT NULL,
	"quality_score" numeric(5, 2),
	"status" "catalog_item_status" DEFAULT 'pending_approval' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"type" "catalog_item_type" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"version" text DEFAULT '1.0.0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_frameworks" (
	"controls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"description" text DEFAULT '',
	"id" text PRIMARY KEY NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"name" text NOT NULL,
	"organization_id" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_messages" (
	"content" text NOT NULL,
	"conversation_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"role" text NOT NULL,
	"token_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"external_id" text,
	"id" text PRIMARY KEY NOT NULL,
	"last_message_at" timestamp with time zone,
	"message_count" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"model" text,
	"organization_id" text NOT NULL,
	"system_prompt" text,
	"title" text DEFAULT '',
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evaluation_results" (
	"actual_output" text,
	"cost" numeric(10, 6),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"evaluation_id" text NOT NULL,
	"expected_output" text,
	"feedback" text,
	"id" text PRIMARY KEY NOT NULL,
	"input" text NOT NULL,
	"latency_ms" integer,
	"metrics" jsonb DEFAULT '{}'::jsonb,
	"passed" text,
	"score" numeric(5, 4),
	"token_count" integer
);
--> statement-breakpoint
CREATE TABLE "evaluations" (
	"completed_at" timestamp with time zone,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"description" text DEFAULT '',
	"evaluator_type" text NOT NULL,
	"fail_count" integer DEFAULT 0 NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"model" text NOT NULL,
	"name" text NOT NULL,
	"organization_id" text NOT NULL,
	"pass_count" integer DEFAULT 0 NOT NULL,
	"results" jsonb,
	"sample_count" integer DEFAULT 0 NOT NULL,
	"score" numeric(5, 4),
	"started_at" timestamp with time zone,
	"status" "evaluation_status" DEFAULT 'pending' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experiment_variants" (
	"config" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"experiment_id" text NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"model" text NOT NULL,
	"name" text NOT NULL,
	"provider" text,
	"request_count" integer DEFAULT 0 NOT NULL,
	"total_cost" numeric(12, 6) DEFAULT '0' NOT NULL,
	"total_latency_ms" integer DEFAULT 0 NOT NULL,
	"weight" integer DEFAULT 50 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experiments" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"description" text DEFAULT '',
	"ends_at" timestamp with time zone,
	"id" text PRIMARY KEY NOT NULL,
	"minimum_samples" integer DEFAULT 1000 NOT NULL,
	"name" text NOT NULL,
	"organization_id" text NOT NULL,
	"primary_metric" text DEFAULT 'cost' NOT NULL,
	"secondary_metrics" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"starts_at" timestamp with time zone,
	"status" "experiment_status" DEFAULT 'draft' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ip_allowlists" (
	"cidr" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"description" text DEFAULT '',
	"id" text PRIMARY KEY NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"organization_id" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_servers" (
	"access_control" jsonb DEFAULT '{"allowedKeys":[],"allowedTeams":[]}'::jsonb,
	"capabilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"description" text DEFAULT '',
	"health_check_interval" integer DEFAULT 60 NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"last_health_check" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"name" text NOT NULL,
	"organization_id" text NOT NULL,
	"status" "mcp_server_status" DEFAULT 'active' NOT NULL,
	"tool_count" integer DEFAULT 0 NOT NULL,
	"transport" text DEFAULT 'stdio' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plugins" (
	"code" text,
	"config" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"description" text DEFAULT '',
	"hooks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"is_official" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"name" text NOT NULL,
	"organization_id" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" text DEFAULT '1.0.0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policies" (
	"compliance_frameworks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"description" text DEFAULT '',
	"id" text PRIMARY KEY NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"name" text NOT NULL,
	"organization_id" text NOT NULL,
	"scope" "policy_scope" DEFAULT 'organization' NOT NULL,
	"scope_id" text,
	"status" "policy_status" DEFAULT 'draft' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policy_evaluations" (
	"compliance_control" text,
	"compliance_framework" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"enforcement" text NOT NULL,
	"evidence" jsonb,
	"id" text PRIMARY KEY NOT NULL,
	"matched" boolean NOT NULL,
	"organization_id" text NOT NULL,
	"policy_id" text NOT NULL,
	"request_id" text NOT NULL,
	"rule_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policy_rules" (
	"compliance_map" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"condition" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"description" text DEFAULT '',
	"enforcement" "rule_enforcement" NOT NULL,
	"evidence_config" jsonb DEFAULT '{}'::jsonb,
	"id" text PRIMARY KEY NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"name" text NOT NULL,
	"policy_id" text NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"type" "rule_type" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_identities" ADD CONSTRAINT "agent_identities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_frameworks" ADD CONSTRAINT "compliance_frameworks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_results" ADD CONSTRAINT "evaluation_results_evaluation_id_evaluations_id_fk" FOREIGN KEY ("evaluation_id") REFERENCES "public"."evaluations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiment_variants" ADD CONSTRAINT "experiment_variants_experiment_id_experiments_id_fk" FOREIGN KEY ("experiment_id") REFERENCES "public"."experiments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiments" ADD CONSTRAINT "experiments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ip_allowlists" ADD CONSTRAINT "ip_allowlists_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_servers" ADD CONSTRAINT "mcp_servers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plugins" ADD CONSTRAINT "plugins_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policies" ADD CONSTRAINT "policies_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_evaluations" ADD CONSTRAINT "policy_evaluations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_rules" ADD CONSTRAINT "policy_rules_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_identities_org_idx" ON "agent_identities" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "agent_identities_status_idx" ON "agent_identities" USING btree ("status");--> statement-breakpoint
CREATE INDEX "agent_identities_parent_idx" ON "agent_identities" USING btree ("parent_agent_id");--> statement-breakpoint
CREATE INDEX "catalog_items_org_idx" ON "catalog_items" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "catalog_items_type_idx" ON "catalog_items" USING btree ("type");--> statement-breakpoint
CREATE INDEX "catalog_items_status_idx" ON "catalog_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "compliance_frameworks_org_idx" ON "compliance_frameworks" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "conversation_messages_conv_idx" ON "conversation_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "conversations_org_idx" ON "conversations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "conversations_external_idx" ON "conversations" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "evaluation_results_eval_idx" ON "evaluation_results" USING btree ("evaluation_id");--> statement-breakpoint
CREATE INDEX "evaluations_org_idx" ON "evaluations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "evaluations_status_idx" ON "evaluations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "experiment_variants_exp_idx" ON "experiment_variants" USING btree ("experiment_id");--> statement-breakpoint
CREATE INDEX "experiments_org_idx" ON "experiments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "experiments_status_idx" ON "experiments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ip_allowlists_org_idx" ON "ip_allowlists" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "mcp_servers_org_idx" ON "mcp_servers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "mcp_servers_status_idx" ON "mcp_servers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "plugins_org_idx" ON "plugins" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "policies_org_idx" ON "policies" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "policies_scope_idx" ON "policies" USING btree ("scope","scope_id");--> statement-breakpoint
CREATE INDEX "policy_evals_org_idx" ON "policy_evaluations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "policy_evals_request_idx" ON "policy_evaluations" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "policy_rules_policy_idx" ON "policy_rules" USING btree ("policy_id");