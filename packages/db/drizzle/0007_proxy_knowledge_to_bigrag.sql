-- Drop foreign key constraints first
ALTER TABLE "knowledge_key_bindings" DROP CONSTRAINT IF EXISTS "knowledge_key_bindings_collection_id_knowledge_collections_id_fk";
ALTER TABLE "knowledge_query_logs" DROP CONSTRAINT IF EXISTS "knowledge_query_logs_collection_id_knowledge_collections_id_fk";

-- Migrate key bindings: add collection_name, populate from collections, drop collection_id
ALTER TABLE "knowledge_key_bindings" ADD COLUMN "collection_name" text;
UPDATE "knowledge_key_bindings" kb SET "collection_name" = (
  SELECT kc."name" FROM "knowledge_collections" kc WHERE kc."id" = kb."collection_id"
);
ALTER TABLE "knowledge_key_bindings" ALTER COLUMN "collection_name" SET NOT NULL;
ALTER TABLE "knowledge_key_bindings" DROP COLUMN "collection_id";
DROP INDEX IF EXISTS "knowledge_key_bindings_collection_idx";
CREATE INDEX "knowledge_key_bindings_collection_idx" ON "knowledge_key_bindings" USING btree ("collection_name");

-- Migrate query logs: add collection_name, populate from collections, drop collection_id
ALTER TABLE "knowledge_query_logs" ADD COLUMN "collection_name" text;
UPDATE "knowledge_query_logs" ql SET "collection_name" = (
  SELECT kc."name" FROM "knowledge_collections" kc WHERE kc."id" = ql."collection_id"
);
UPDATE "knowledge_query_logs" SET "collection_name" = 'unknown' WHERE "collection_name" IS NULL;
ALTER TABLE "knowledge_query_logs" ALTER COLUMN "collection_name" SET NOT NULL;
ALTER TABLE "knowledge_query_logs" DROP COLUMN "collection_id";
DROP INDEX IF EXISTS "knowledge_query_logs_collection_idx";
CREATE INDEX "knowledge_query_logs_collection_idx" ON "knowledge_query_logs" USING btree ("collection_name");

-- Drop the tables we no longer need
DROP TABLE IF EXISTS "knowledge_documents" CASCADE;
DROP TABLE IF EXISTS "knowledge_collections" CASCADE;

-- Drop enums
DROP TYPE IF EXISTS "public"."document_source_type";
DROP TYPE IF EXISTS "public"."document_status";
