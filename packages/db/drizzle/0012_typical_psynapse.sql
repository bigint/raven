ALTER TABLE "virtual_keys" DROP CONSTRAINT "virtual_keys_team_id_teams_id_fk";
--> statement-breakpoint
ALTER TABLE "budgets" ALTER COLUMN "entity_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."budget_entity_type";--> statement-breakpoint
CREATE TYPE "public"."budget_entity_type" AS ENUM('organization', 'key');--> statement-breakpoint
ALTER TABLE "budgets" ALTER COLUMN "entity_type" SET DATA TYPE "public"."budget_entity_type" USING "entity_type"::"public"."budget_entity_type";--> statement-breakpoint
ALTER TABLE "agent_identities" ALTER COLUMN "capabilities" SET DEFAULT '{"allowedModels":[],"allowedTools":[],"maxConcurrentRequests":10,"maxCostPerRequest":1,"maxTokensPerRequest":100000}'::jsonb;--> statement-breakpoint
ALTER TABLE "virtual_keys" DROP COLUMN "team_id";