-- Add performance indexes for high-throughput proxy request handling
-- These indexes cover all hot-path queries that previously did full table scans

-- Virtual keys: auth lookup by hash, org+active filtering
CREATE INDEX IF NOT EXISTS "virtual_keys_key_hash_idx" ON "virtual_keys" USING btree ("key_hash");
CREATE INDEX IF NOT EXISTS "virtual_keys_org_active_idx" ON "virtual_keys" USING btree ("organization_id","is_active");

-- Provider configs: provider resolution per org
CREATE INDEX IF NOT EXISTS "provider_configs_org_provider_enabled_idx" ON "provider_configs" USING btree ("organization_id","provider","is_enabled");

-- Budgets: budget check per org+entity
CREATE INDEX IF NOT EXISTS "budgets_org_entity_idx" ON "budgets" USING btree ("organization_id","entity_id");

-- Guardrail rules: rule evaluation per org
CREATE INDEX IF NOT EXISTS "guardrail_rules_org_enabled_idx" ON "guardrail_rules" USING btree ("organization_id","is_enabled");

-- Routing rules: content routing per org+model
CREATE INDEX IF NOT EXISTS "routing_rules_org_model_enabled_idx" ON "routing_rules" USING btree ("organization_id","source_model","is_enabled");

-- Webhooks: webhook dispatch per org
CREATE INDEX IF NOT EXISTS "webhooks_org_enabled_idx" ON "webhooks" USING btree ("organization_id","is_enabled");

-- Subscriptions: plan lookup per org
CREATE INDEX IF NOT EXISTS "subscriptions_org_idx" ON "subscriptions" USING btree ("organization_id");

-- Custom domains: domain resolution
CREATE INDEX IF NOT EXISTS "custom_domains_domain_status_idx" ON "custom_domains" USING btree ("domain","status");

-- Request logs: analytics queries (3 additional compound indexes)
CREATE INDEX IF NOT EXISTS "request_logs_org_key_created_idx" ON "request_logs" USING btree ("organization_id","virtual_key_id","created_at");
CREATE INDEX IF NOT EXISTS "request_logs_org_session_created_idx" ON "request_logs" USING btree ("organization_id","session_id","created_at");
CREATE INDEX IF NOT EXISTS "request_logs_provider_model_org_created_idx" ON "request_logs" USING btree ("provider","model","organization_id","created_at");

-- Members: user lookup for org membership checks
CREATE INDEX IF NOT EXISTS "members_user_idx" ON "members" USING btree ("user_id");

-- Teams: org-scoped team listing
CREATE INDEX IF NOT EXISTS "teams_org_idx" ON "teams" USING btree ("organization_id");
