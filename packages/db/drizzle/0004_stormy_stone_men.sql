ALTER TABLE "knowledge_chunks" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "knowledge_chunks" CASCADE;--> statement-breakpoint
ALTER TABLE "knowledge_collections" ALTER COLUMN "similarity_threshold" SET DEFAULT 0.3;--> statement-breakpoint
ALTER TABLE "knowledge_documents" ADD COLUMN "bigrag_document_id" text;--> statement-breakpoint
ALTER TABLE "knowledge_collections" DROP COLUMN "chunk_strategy";--> statement-breakpoint
DROP TYPE "public"."chunk_strategy";