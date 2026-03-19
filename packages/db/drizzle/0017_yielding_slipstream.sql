ALTER TABLE "request_logs" ADD COLUMN "end_user" text;--> statement-breakpoint
ALTER TABLE "request_logs" ADD COLUMN "is_starred" boolean DEFAULT false NOT NULL;