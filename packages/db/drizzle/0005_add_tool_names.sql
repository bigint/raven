ALTER TABLE "request_logs" ADD COLUMN "tool_names" jsonb DEFAULT '[]'::jsonb;
