import { createId } from "@paralleldrive/cuid2";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp
} from "drizzle-orm/pg-core";

export const documentSourceTypeEnum = pgEnum("document_source_type", [
  "file",
  "url",
  "image"
]);

export const documentStatusEnum = pgEnum("document_status", [
  "pending",
  "processing",
  "ready",
  "failed"
]);

export const knowledgeCollections = pgTable(
  "knowledge_collections",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    description: text("description"),
    id: text("id").primaryKey().$defaultFn(createId),
    isDefault: boolean("is_default").notNull().default(false),
    isEnabled: boolean("is_enabled").notNull().default(true),
    maxContextTokens: integer("max_context_tokens").notNull().default(4096),
    name: text("name").notNull().unique(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (t) => [
    index("knowledge_collections_name_idx").on(t.name),
    index("knowledge_collections_enabled_idx").on(t.isEnabled)
  ]
);

export const knowledgeDocuments = pgTable(
  "knowledge_documents",
  {
    bigragDocumentId: text("bigrag_document_id"),
    chunkCount: integer("chunk_count").notNull().default(0),
    collectionId: text("collection_id")
      .notNull()
      .references(() => knowledgeCollections.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    errorMessage: text("error_message"),
    fileSize: integer("file_size"),
    id: text("id").primaryKey().$defaultFn(createId),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    mimeType: text("mime_type").notNull(),
    sourceType: documentSourceTypeEnum("source_type").notNull(),
    status: documentStatusEnum("status").notNull().default("pending"),
    title: text("title").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (t) => [
    index("knowledge_documents_collection_idx").on(t.collectionId),
    index("knowledge_documents_status_idx").on(t.status)
  ]
);

export const knowledgeKeyBindings = pgTable(
  "knowledge_key_bindings",
  {
    collectionId: text("collection_id")
      .notNull()
      .references(() => knowledgeCollections.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: text("id").primaryKey().$defaultFn(createId),
    ragEnabled: boolean("rag_enabled").notNull().default(true),
    virtualKeyId: text("virtual_key_id").notNull()
  },
  (t) => [
    index("knowledge_key_bindings_key_idx").on(t.virtualKeyId),
    index("knowledge_key_bindings_collection_idx").on(t.collectionId)
  ]
);

export const knowledgeQueryLogs = pgTable(
  "knowledge_query_logs",
  {
    chunkIds: jsonb("chunk_ids")
      .notNull()
      .$type<{ id: string; score: number }[]>(),
    chunksInjected: integer("chunks_injected").notNull(),
    chunksRetrieved: integer("chunks_retrieved").notNull(),
    collectionId: text("collection_id")
      .notNull()
      .references(() => knowledgeCollections.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: text("id").primaryKey().$defaultFn(createId),
    latencyMs: integer("latency_ms").notNull(),
    queryText: text("query_text").notNull(),
    requestLogId: text("request_log_id"),
    topSimilarityScore: doublePrecision("top_similarity_score").notNull(),
    totalContextTokens: integer("total_context_tokens").notNull()
  },
  (t) => [
    index("knowledge_query_logs_collection_idx").on(t.collectionId),
    index("knowledge_query_logs_created_idx").on(t.createdAt)
  ]
);
