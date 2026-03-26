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

export const chunkStrategyEnum = pgEnum("chunk_strategy", [
  "fixed",
  "semantic",
  "hybrid"
]);

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
    chunkOverlap: integer("chunk_overlap").notNull().default(50),
    chunkSize: integer("chunk_size").notNull().default(512),
    chunkStrategy: chunkStrategyEnum("chunk_strategy")
      .notNull()
      .default("hybrid"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    description: text("description"),
    embeddingDimensions: integer("embedding_dimensions")
      .notNull()
      .default(1536),
    embeddingModel: text("embedding_model")
      .notNull()
      .default("text-embedding-3-small"),
    id: text("id").primaryKey().$defaultFn(createId),
    isDefault: boolean("is_default").notNull().default(false),
    isEnabled: boolean("is_enabled").notNull().default(true),
    maxContextTokens: integer("max_context_tokens").notNull().default(4096),
    name: text("name").notNull().unique(),
    rerankingEnabled: boolean("reranking_enabled").notNull().default(false),
    similarityThreshold: doublePrecision("similarity_threshold")
      .notNull()
      .default(0.7),
    topK: integer("top_k").notNull().default(5),
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
    lastCrawledAt: timestamp("last_crawled_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    mimeType: text("mime_type").notNull(),
    recrawlEnabled: boolean("recrawl_enabled").notNull().default(false),
    recrawlIntervalHours: integer("recrawl_interval_hours"),
    sourceType: documentSourceTypeEnum("source_type").notNull(),
    sourceUrl: text("source_url"),
    status: documentStatusEnum("status").notNull().default("pending"),
    title: text("title").notNull(),
    tokenCount: integer("token_count").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (t) => [
    index("knowledge_documents_collection_idx").on(t.collectionId),
    index("knowledge_documents_status_idx").on(t.status)
  ]
);

export const knowledgeChunks = pgTable(
  "knowledge_chunks",
  {
    chunkIndex: integer("chunk_index").notNull(),
    collectionId: text("collection_id")
      .notNull()
      .references(() => knowledgeCollections.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    documentId: text("document_id")
      .notNull()
      .references(() => knowledgeDocuments.id, { onDelete: "cascade" }),
    id: text("id").primaryKey().$defaultFn(createId),
    tokenCount: integer("token_count").notNull()
  },
  (t) => [
    index("knowledge_chunks_document_idx").on(t.documentId),
    index("knowledge_chunks_collection_idx").on(t.collectionId)
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
