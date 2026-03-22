DROP INDEX "request_logs_deleted_created_idx";--> statement-breakpoint
DROP INDEX "request_logs_created_deleted_idx";--> statement-breakpoint
ALTER TABLE "audit_logs" DROP COLUMN "deleted_at";--> statement-breakpoint
ALTER TABLE "request_logs" DROP COLUMN "deleted_at";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "deleted_at";