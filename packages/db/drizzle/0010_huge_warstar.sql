ALTER TABLE "models" DROP CONSTRAINT "models_provider_synced_providers_slug_fk";
--> statement-breakpoint
ALTER TABLE "request_logs" ADD COLUMN "request_body" jsonb;--> statement-breakpoint
CREATE INDEX "models_provider_idx" ON "models" USING btree ("provider");