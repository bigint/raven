import { createId } from "@paralleldrive/cuid2";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp
} from "drizzle-orm/pg-core";

export const knowledgeKeyBindings = pgTable(
  "knowledge_key_bindings",
  {
    collectionName: text("collection_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: text("id").primaryKey().$defaultFn(createId),
    ragEnabled: boolean("rag_enabled").notNull().default(true),
    virtualKeyId: text("virtual_key_id").notNull()
  },
  (t) => [
    index("knowledge_key_bindings_key_idx").on(t.virtualKeyId),
    index("knowledge_key_bindings_collection_idx").on(t.collectionName)
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
    collectionName: text("collection_name").notNull(),
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
    index("knowledge_query_logs_collection_idx").on(t.collectionName),
    index("knowledge_query_logs_created_idx").on(t.createdAt)
  ]
);
