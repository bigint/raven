CREATE TYPE "public"."chunk_strategy" AS ENUM('fixed', 'semantic', 'hybrid');--> statement-breakpoint
CREATE TYPE "public"."document_source_type" AS ENUM('file', 'url', 'image');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('pending', 'processing', 'ready', 'failed');--> statement-breakpoint
CREATE TABLE "knowledge_chunks" (
	"chunk_index" integer NOT NULL,
	"collection_id" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"document_id" text NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"token_count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_collections" (
	"chunk_overlap" integer DEFAULT 50 NOT NULL,
	"chunk_size" integer DEFAULT 512 NOT NULL,
	"chunk_strategy" "chunk_strategy" DEFAULT 'hybrid' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"description" text,
	"embedding_dimensions" integer DEFAULT 1536 NOT NULL,
	"embedding_model" text DEFAULT 'text-embedding-3-small' NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"max_context_tokens" integer DEFAULT 4096 NOT NULL,
	"name" text NOT NULL,
	"reranking_enabled" boolean DEFAULT false NOT NULL,
	"similarity_threshold" double precision DEFAULT 0.7 NOT NULL,
	"top_k" integer DEFAULT 5 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_collections_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "knowledge_documents" (
	"chunk_count" integer DEFAULT 0 NOT NULL,
	"collection_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"error_message" text,
	"file_size" integer,
	"id" text PRIMARY KEY NOT NULL,
	"last_crawled_at" timestamp with time zone,
	"metadata" jsonb,
	"mime_type" text NOT NULL,
	"recrawl_enabled" boolean DEFAULT false NOT NULL,
	"recrawl_interval_hours" integer,
	"source_type" "document_source_type" NOT NULL,
	"source_url" text,
	"status" "document_status" DEFAULT 'pending' NOT NULL,
	"title" text NOT NULL,
	"token_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_key_bindings" (
	"collection_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"rag_enabled" boolean DEFAULT true NOT NULL,
	"virtual_key_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_query_logs" (
	"chunk_ids" jsonb NOT NULL,
	"chunks_injected" integer NOT NULL,
	"chunks_retrieved" integer NOT NULL,
	"collection_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"latency_ms" integer NOT NULL,
	"query_text" text NOT NULL,
	"request_log_id" text,
	"top_similarity_score" double precision NOT NULL,
	"total_context_tokens" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_collection_id_knowledge_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."knowledge_collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_document_id_knowledge_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."knowledge_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_collection_id_knowledge_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."knowledge_collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_key_bindings" ADD CONSTRAINT "knowledge_key_bindings_collection_id_knowledge_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."knowledge_collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_query_logs" ADD CONSTRAINT "knowledge_query_logs_collection_id_knowledge_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."knowledge_collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "knowledge_chunks_document_idx" ON "knowledge_chunks" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "knowledge_chunks_collection_idx" ON "knowledge_chunks" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "knowledge_collections_name_idx" ON "knowledge_collections" USING btree ("name");--> statement-breakpoint
CREATE INDEX "knowledge_collections_enabled_idx" ON "knowledge_collections" USING btree ("is_enabled");--> statement-breakpoint
CREATE INDEX "knowledge_documents_collection_idx" ON "knowledge_documents" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "knowledge_documents_status_idx" ON "knowledge_documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "knowledge_key_bindings_key_idx" ON "knowledge_key_bindings" USING btree ("virtual_key_id");--> statement-breakpoint
CREATE INDEX "knowledge_key_bindings_collection_idx" ON "knowledge_key_bindings" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "knowledge_query_logs_collection_idx" ON "knowledge_query_logs" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "knowledge_query_logs_created_idx" ON "knowledge_query_logs" USING btree ("created_at");