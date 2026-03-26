# Knowledge RAG Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add RAG (Retrieval-Augmented Generation) capabilities to Raven — document ingestion, vector search via Qdrant, and transparent context injection into the existing LLM proxy pipeline.

**Architecture:** New modules in `apps/api/src/modules/knowledge/` and new dashboard pages in `apps/web/src/app/(dashboard)/knowledge/`. The RAG injection step hooks into the existing proxy pipeline between guardrails and cache check. Qdrant stores vectors; Postgres stores metadata; Redis powers the job queue.

**Tech Stack:** Qdrant (vector DB), OpenAI embeddings, pdf-parse, mammoth, @mozilla/readability, linkedom

**Spec:** `docs/specs/2026-03-26-knowledge-rag-platform.md`

---

## File Structure

### Backend (`apps/api/src/`)

```
modules/knowledge/
  index.ts                    — Hono module factory, registers all knowledge routes
  collections/
    index.ts                  — Collection sub-router
    schema.ts                 — Zod schemas for collection create/update
    list.ts                   — GET /collections
    get.ts                    — GET /collections/:id (with stats)
    create.ts                 — POST /collections
    update.ts                 — PATCH /collections/:id
    delete.ts                 — DELETE /collections/:id
  documents/
    index.ts                  — Document sub-router
    schema.ts                 — Zod schemas for document operations
    list.ts                   — GET /collections/:id/documents
    get.ts                    — GET /documents/:id
    upload.ts                 — POST /collections/:id/documents (file upload)
    ingest-url.ts             — POST /collections/:id/documents/url
    ingest-image.ts           — POST /collections/:id/documents/image
    reprocess.ts              — POST /documents/:id/reprocess
    delete.ts                 — DELETE /documents/:id
  search/
    index.ts                  — POST /knowledge/search (retrieval API)
    schema.ts                 — Zod schema for search request
  key-bindings/
    index.ts                  — Key binding sub-router
    schema.ts                 — Zod schemas
    get.ts                    — GET /keys/:id/collections
    update.ts                 — PUT /keys/:id/collections
  analytics/
    index.ts                  — Analytics sub-router
    stats.ts                  — GET /admin/knowledge/analytics
    query-logs.ts             — GET /admin/knowledge/query-logs
  ingestion/
    queue.ts                  — Redis-based job queue (enqueue, dequeue, retry)
    worker.ts                 — Job worker (processes ingestion jobs)
    chunker.ts                — Hybrid text chunking
    embedder.ts               — OpenAI embedding client
    parsers/
      pdf.ts                  — PDF text extraction
      docx.ts                 — DOCX text extraction
      markdown.ts             — Markdown/plain text extraction
      url.ts                  — URL scraping (readability + linkedom)
      image.ts                — Image OCR via OpenAI vision
  rag/
    injection.ts              — RAG pipeline step (embed query, search, build context)
    qdrant.ts                 — Qdrant client wrapper (create/delete collection, upsert, search)
    reranker.ts               — Optional reranking via OpenAI
lib/
  qdrant.ts                   — Qdrant client singleton (like redis.ts pattern)
```

### Database (`packages/db/src/schema/`)

```
knowledge.ts                  — All knowledge tables (collections, documents, chunks, key_bindings, query_logs)
```

### Frontend (`apps/web/src/app/(dashboard)/knowledge/`)

```
page.tsx                      — Collections list page
[id]/
  page.tsx                    — Collection detail page (tabs: overview, documents, search)
  documents/
    [docId]/
      page.tsx                — Document detail page (chunk viewer)
  components/
    collection-form.tsx       — Create/edit collection modal
    collection-stats.tsx      — Stats overview cards
    documents-tab.tsx         — Document table with upload actions
    search-tab.tsx            — Search testing interface
    upload-modal.tsx          — File upload drag-and-drop modal
    url-ingest-modal.tsx      — URL ingestion modal
    chunk-viewer.tsx          — Paginated chunk list
hooks/
  use-collections.ts          — TanStack Query hooks for collections
  use-documents.ts            — TanStack Query hooks for documents
  use-search.ts               — Search mutation hook
  use-query-logs.ts           — Query logs hook
analytics/
  page.tsx                    — Knowledge analytics dashboard
```

---

## Task 1: Install Dependencies and Add Qdrant to Docker

**Files:**
- Modify: `apps/api/package.json`
- Modify: `docker-compose.yml`
- Modify: `.env.example`
- Modify: `packages/config/src/env.ts`

- [ ] **Step 1: Install backend dependencies**

Run: `pnpm --filter @raven/api add @qdrant/js-client-rest openai pdf-parse mammoth linkedom @mozilla/readability`

- [ ] **Step 2: Install type definitions**

Run: `pnpm --filter @raven/api add -D @types/pdf-parse`

- [ ] **Step 3: Add Qdrant to docker-compose.yml**

Replace the full contents of `docker-compose.yml`:

```yaml
services:
  raven:
    image: yoginth/raven:latest
    ports:
      - "3000:3000"
      - "4000:4000"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage
    restart: unless-stopped

volumes:
  postgres_data:
  qdrant_data:
```

- [ ] **Step 4: Add Qdrant env vars to .env.example**

Append to `.env.example`:

```
# Qdrant (vector database for Knowledge RAG)
QDRANT_URL=http://localhost:6333
# QDRANT_API_KEY=
```

- [ ] **Step 5: Add Qdrant env vars to config parser**

In `packages/config/src/env.ts`, add to `envSchema`:

```typescript
QDRANT_API_KEY: z.string().optional(),
QDRANT_URL: z.string().url().default("http://localhost:6333"),
```

- [ ] **Step 6: Add to local .env file**

Append to `.env`:

```
QDRANT_URL=http://localhost:6333
```

- [ ] **Step 7: Commit**

```
git add -A && git commit -m "feat: add qdrant dependencies and docker config for knowledge RAG"
```

---

## Task 2: Database Schema — Knowledge Tables

**Files:**
- Create: `packages/db/src/schema/knowledge.ts`
- Modify: `packages/db/src/schema/index.ts`

- [ ] **Step 1: Create knowledge schema file**

Create `packages/db/src/schema/knowledge.ts`:

```typescript
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
    chunkStrategy: chunkStrategyEnum("chunk_strategy").notNull().default("hybrid"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    description: text("description"),
    embeddingDimensions: integer("embedding_dimensions").notNull().default(1536),
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
```

- [ ] **Step 2: Export from schema index**

In `packages/db/src/schema/index.ts`, add these exports:

```typescript
export {
  chunkStrategyEnum,
  documentSourceTypeEnum,
  documentStatusEnum,
  knowledgeChunks,
  knowledgeCollections,
  knowledgeDocuments,
  knowledgeKeyBindings,
  knowledgeQueryLogs
} from "./knowledge";
```

- [ ] **Step 3: Generate and run migration**

Run: `pnpm db:generate && pnpm db:migrate`

- [ ] **Step 4: Commit**

```
git add -A && git commit -m "feat: add knowledge RAG database schema and migration"
```

---

## Task 3: Qdrant Client and Instance Settings

**Files:**
- Create: `apps/api/src/lib/qdrant.ts`
- Modify: `apps/api/src/lib/instance-settings.ts`
- Modify: `apps/api/src/modules/admin/settings.ts`

- [ ] **Step 1: Create Qdrant client singleton**

Create `apps/api/src/lib/qdrant.ts`:

```typescript
import { QdrantClient } from "@qdrant/js-client-rest";

let client: QdrantClient | null = null;

export const getQdrant = (url: string, apiKey?: string): QdrantClient => {
  if (!client) {
    client = new QdrantClient({ apiKey, url });
  }
  return client;
};
```

- [ ] **Step 2: Add knowledge_enabled to InstanceSettings**

In `apps/api/src/lib/instance-settings.ts`:
- Add `readonly knowledge_enabled: boolean;` to the `InstanceSettings` interface
- Add `knowledge_enabled: "false"` to `DEFAULTS`
- Add `knowledge_enabled: toBool(raw.knowledge_enabled)` to the `parse` return

- [ ] **Step 3: Add knowledge_enabled to admin valid keys**

In `apps/api/src/modules/admin/settings.ts`, add `"knowledge_enabled"` to the `VALID_KEYS` set.

- [ ] **Step 4: Commit**

```
git add -A && git commit -m "feat: add qdrant client singleton and knowledge instance settings"
```

---

## Task 4: Ingestion Infrastructure — Queue, Chunker, Embedder, Qdrant Wrapper

**Files:**
- Create: `apps/api/src/modules/knowledge/ingestion/queue.ts`
- Create: `apps/api/src/modules/knowledge/ingestion/chunker.ts`
- Create: `apps/api/src/modules/knowledge/ingestion/embedder.ts`
- Create: `apps/api/src/modules/knowledge/rag/qdrant.ts`

See spec for complete implementations. Key patterns:
- Queue uses Redis lists with `BRPOPLPUSH` for reliable processing, sorted set for delayed retries
- Chunker implements hybrid strategy: semantic split on headers/paragraphs, then enforce max chunk size
- Embedder batches texts (up to 2048 per OpenAI API call), resolves API key from provider configs
- Qdrant wrapper handles collection lifecycle, vector upsert (batched 500), search, and deletion by document ID

- [ ] **Step 1: Create all four files with complete implementations**
- [ ] **Step 2: Commit**

```
git add -A && git commit -m "feat: add ingestion queue, chunker, embedder, and qdrant wrapper"
```

---

## Task 5: Document Parsers

**Files:**
- Create: `apps/api/src/modules/knowledge/ingestion/parsers/pdf.ts`
- Create: `apps/api/src/modules/knowledge/ingestion/parsers/docx.ts`
- Create: `apps/api/src/modules/knowledge/ingestion/parsers/markdown.ts`
- Create: `apps/api/src/modules/knowledge/ingestion/parsers/url.ts`
- Create: `apps/api/src/modules/knowledge/ingestion/parsers/image.ts`

Each parser extracts plain text:
- **pdf.ts**: Uses `pdf-parse` to read buffer and extract text
- **docx.ts**: Uses `mammoth.extractRawText` on file buffer
- **markdown.ts**: Reads file as UTF-8 string
- **url.ts**: Fetches URL, parses HTML with `linkedom`, extracts with `@mozilla/readability`
- **image.ts**: Sends base64 image to OpenAI GPT-4o vision for OCR text extraction

- [ ] **Step 1: Create all five parser files**
- [ ] **Step 2: Commit**

```
git add -A && git commit -m "feat: add document parsers for pdf, docx, markdown, url, and image OCR"
```

---

## Task 6: Ingestion Worker

**Files:**
- Create: `apps/api/src/modules/knowledge/ingestion/worker.ts`

Worker loop:
1. Promotes delayed retry jobs back to main queue
2. Dequeues job (blocks up to 5s)
3. Marks document as `processing`
4. Loads collection config
5. Extracts text (dispatches to correct parser)
6. Chunks text with hybrid strategy
7. Embeds all chunks via OpenAI
8. Ensures Qdrant collection exists
9. Saves chunks to Postgres, upserts vectors to Qdrant
10. Updates document status to `ready`
11. Cleans up temp files
12. On failure: retries with exponential backoff (max 3), marks `failed` when exhausted

- [ ] **Step 1: Create worker with complete implementation**
- [ ] **Step 2: Commit**

```
git add -A && git commit -m "feat: add ingestion worker for processing documents, urls, and images"
```

---

## Task 7: Collections API

**Files:**
- Create: `apps/api/src/modules/knowledge/collections/schema.ts`
- Create: `apps/api/src/modules/knowledge/collections/list.ts`
- Create: `apps/api/src/modules/knowledge/collections/get.ts`
- Create: `apps/api/src/modules/knowledge/collections/create.ts`
- Create: `apps/api/src/modules/knowledge/collections/update.ts`
- Create: `apps/api/src/modules/knowledge/collections/delete.ts`
- Create: `apps/api/src/modules/knowledge/collections/index.ts`

Follows exact patterns from `apps/api/src/modules/keys/`:
- Zod schemas with `createCollectionSchema` and `updateCollectionSchema`
- Handler functions as `(db: Database) => async (c: AuthContextWithJson<Body>) => { ... }`
- Uses `success()`, `created()` response helpers
- Uses `auditAndPublish()` for audit trail
- Collection delete cascades via Postgres FK + fires Qdrant collection deletion
- List includes document counts via join/groupBy

- [ ] **Step 1: Create all seven files**
- [ ] **Step 2: Commit**

```
git add -A && git commit -m "feat: add knowledge collections CRUD API"
```

---

## Task 8: Documents API

**Files:**
- Create: `apps/api/src/modules/knowledge/documents/schema.ts`
- Create: `apps/api/src/modules/knowledge/documents/list.ts`
- Create: `apps/api/src/modules/knowledge/documents/get.ts`
- Create: `apps/api/src/modules/knowledge/documents/upload.ts`
- Create: `apps/api/src/modules/knowledge/documents/ingest-url.ts`
- Create: `apps/api/src/modules/knowledge/documents/ingest-image.ts`
- Create: `apps/api/src/modules/knowledge/documents/reprocess.ts`
- Create: `apps/api/src/modules/knowledge/documents/delete.ts`
- Create: `apps/api/src/modules/knowledge/documents/index.ts`

Key behaviors:
- File upload: validates MIME type (PDF/TXT/MD/DOCX), max 50MB, saves to temp dir, enqueues job
- URL ingest: validates URL, creates document record, enqueues job with optional recrawl config
- Image ingest: validates image MIME (PNG/JPEG/WebP), max 20MB, saves to temp, enqueues job
- Reprocess: deletes existing chunks + vectors, re-enqueues the document
- Delete: cascades via FK for chunks, fires Qdrant vector deletion by document ID
- Get: returns document with all its chunks ordered by index

- [ ] **Step 1: Create all nine files**
- [ ] **Step 2: Commit**

```
git add -A && git commit -m "feat: add knowledge documents API with upload, url ingest, image OCR, and reprocessing"
```

---

## Task 9: Search API and Key Bindings

**Files:**
- Create: `apps/api/src/modules/knowledge/search/schema.ts`
- Create: `apps/api/src/modules/knowledge/search/index.ts`
- Create: `apps/api/src/modules/knowledge/key-bindings/schema.ts`
- Create: `apps/api/src/modules/knowledge/key-bindings/get.ts`
- Create: `apps/api/src/modules/knowledge/key-bindings/update.ts`
- Create: `apps/api/src/modules/knowledge/key-bindings/index.ts`

Search handler:
- Accepts `{ query, collectionId?, topK?, threshold? }`
- Falls back to default collection if no collectionId
- Embeds query, searches Qdrant, enriches results with document titles

Key bindings:
- GET returns bindings with collection names (inner join)
- PUT replaces all bindings for a key (delete + insert pattern)

- [ ] **Step 1: Create all six files**
- [ ] **Step 2: Commit**

```
git add -A && git commit -m "feat: add knowledge search API and key bindings management"
```

---

## Task 10: RAG Injection into Proxy Pipeline

**Files:**
- Create: `apps/api/src/modules/knowledge/rag/injection.ts`
- Create: `apps/api/src/modules/knowledge/rag/reranker.ts`
- Modify: `apps/api/src/modules/proxy/pipeline.ts`

RAG injection logic:
1. Checks `X-Knowledge-Enabled` header, then key bindings, then default collection
2. Extracts last user message text
3. Embeds query (with 5min Redis cache)
4. Searches Qdrant across target collection(s)
5. Optional reranking via GPT-4o-mini
6. Builds context string within `maxContextTokens` budget
7. Prepends as system message
8. Logs to `knowledge_query_logs`
9. Returns `X-Knowledge-Used` and `X-Knowledge-Chunks` headers

Pipeline modification:
- Add `qdrant` and `knowledgeEnabled` to `PipelineInput`
- Insert RAG step between guardrails (step 4) and cache check (step 6)
- Wrap in try/catch so RAG failure doesn't block the request

Reranker:
- Sends chunks + query to GPT-4o-mini asking for relevance ordering
- Parses comma-separated index list from response
- Falls back to original order on parse failure

- [ ] **Step 1: Create injection.ts and reranker.ts**
- [ ] **Step 2: Modify pipeline.ts to add RAG step**
- [ ] **Step 3: Commit**

```
git add -A && git commit -m "feat: add RAG injection into proxy pipeline with context prepend and query logging"
```

---

## Task 11: Knowledge Module Registration and Worker Startup

**Files:**
- Create: `apps/api/src/modules/knowledge/index.ts`
- Modify: `apps/api/src/index.ts`
- Modify: `apps/api/src/modules/openai-compat/index.ts`
- Modify: `apps/api/src/modules/openai-compat/handler.ts`

Module root (`knowledge/index.ts`):
- Creates Hono app with sub-routes: collections, documents, search

Main app changes (`index.ts`):
- Import `getQdrant` and initialize client
- Start ingestion worker, store `stopWorker` handle
- Mount knowledge routes under protected v1 routes
- Mount key bindings under existing keys path
- Pass `qdrant` and `knowledgeEnabled` to proxy pipeline calls
- Stop worker on shutdown

OpenAI compat changes:
- Accept `qdrant` and `knowledgeEnabled` params
- Forward to `runPipeline`

- [ ] **Step 1: Create knowledge/index.ts**
- [ ] **Step 2: Modify main app to wire everything together**
- [ ] **Step 3: Update openai-compat module signatures**
- [ ] **Step 4: Commit**

```
git add -A && git commit -m "feat: register knowledge module routes and start ingestion worker"
```

---

## Task 12: Knowledge Analytics API

**Files:**
- Create: `apps/api/src/modules/knowledge/analytics/stats.ts`
- Create: `apps/api/src/modules/knowledge/analytics/query-logs.ts`
- Create: `apps/api/src/modules/knowledge/analytics/index.ts`
- Modify: `apps/api/src/index.ts` (register under admin routes)

Stats endpoint returns:
- Collection count, document count, total tokens
- 30-day query stats: total queries, avg chunks per query, avg similarity, top collections

Query logs endpoint:
- Paginated list with collection name, query text, chunks retrieved, top score, latency

- [ ] **Step 1: Create all three files**
- [ ] **Step 2: Register under admin routes in index.ts**
- [ ] **Step 3: Commit**

```
git add -A && git commit -m "feat: add knowledge analytics and query logs API"
```

---

## Task 13: Frontend — Collections List Page and Sidebar

**Files:**
- Create: `apps/web/src/app/(dashboard)/knowledge/hooks/use-collections.ts`
- Create: `apps/web/src/app/(dashboard)/knowledge/[id]/components/collection-form.tsx`
- Create: `apps/web/src/app/(dashboard)/knowledge/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/components/sidebar.tsx`

Collections hooks follow `use-keys.ts` pattern:
- `collectionsQueryOptions()` and `collectionDetailQueryOptions(id)`
- `useCreateCollection`, `useUpdateCollection`, `useDeleteCollection` mutation hooks
- Toast notifications via `sonner`

Collection form modal:
- Fields: name, description, embedding model (select), chunk strategy (select), chunk size, overlap, topK, threshold, max context tokens, reranking toggle, default toggle

Collections page:
- DataTable with columns: name (link), document count, embedding model, default badge, enabled toggle
- Empty state with create action
- Create modal and delete confirm dialog

Sidebar:
- Add `BookOpen` icon import
- Add `{ href: "/knowledge", icon: BookOpen, label: "Knowledge" }` to `NAV_ITEMS` after Guardrails

- [ ] **Step 1: Create hooks, form, and page files**
- [ ] **Step 2: Add Knowledge nav item to sidebar**
- [ ] **Step 3: Commit**

```
git add -A && git commit -m "feat: add knowledge collections list page and sidebar navigation"
```

---

## Task 14: Frontend — Collection Detail Page

**Files:**
- Create: `apps/web/src/app/(dashboard)/knowledge/hooks/use-documents.ts`
- Create: `apps/web/src/app/(dashboard)/knowledge/hooks/use-search.ts`
- Create: `apps/web/src/app/(dashboard)/knowledge/[id]/components/collection-stats.tsx`
- Create: `apps/web/src/app/(dashboard)/knowledge/[id]/components/documents-tab.tsx`
- Create: `apps/web/src/app/(dashboard)/knowledge/[id]/components/upload-modal.tsx`
- Create: `apps/web/src/app/(dashboard)/knowledge/[id]/components/url-ingest-modal.tsx`
- Create: `apps/web/src/app/(dashboard)/knowledge/[id]/components/search-tab.tsx`
- Create: `apps/web/src/app/(dashboard)/knowledge/[id]/page.tsx`

Document hooks:
- CRUD hooks plus specialized `useUploadDocument` (FormData via ky), `useIngestUrl`, `useUploadImage`
- Upload hooks use direct `ky` POST with `FormData` body (not JSON)

Collection detail page:
- Tabs component with Overview (stats cards), Documents (table + upload/url actions), Search (query input + results)

Upload modal: drag-and-drop zone, auto-detects image vs document types
URL modal: URL input + optional recrawl config
Search tab: query input + results with similarity scores and source attribution

- [ ] **Step 1: Create all eight files**
- [ ] **Step 2: Commit**

```
git add -A && git commit -m "feat: add collection detail page with documents, upload, url ingest, and search tabs"
```

---

## Task 15: Frontend — Document Detail and Chunk Viewer

**Files:**
- Create: `apps/web/src/app/(dashboard)/knowledge/[id]/components/chunk-viewer.tsx`
- Create: `apps/web/src/app/(dashboard)/knowledge/[id]/documents/[docId]/page.tsx`

Chunk viewer: paginated list (20 per page) showing chunk index, content, token count
Document detail page: metadata header (type, status, chunks, date), error display, source URL link, chunk viewer

- [ ] **Step 1: Create both files**
- [ ] **Step 2: Commit**

```
git add -A && git commit -m "feat: add document detail page with chunk viewer"
```

---

## Task 16: Frontend — Knowledge Analytics Page

**Files:**
- Create: `apps/web/src/app/(dashboard)/knowledge/hooks/use-query-logs.ts`
- Create: `apps/web/src/app/(dashboard)/knowledge/analytics/page.tsx`

Analytics hooks: `knowledgeStatsQueryOptions()` and `queryLogsQueryOptions()`
Analytics page: stats cards (collections, documents, tokens, queries) + recent query logs table

- [ ] **Step 1: Create both files**
- [ ] **Step 2: Commit**

```
git add -A && git commit -m "feat: add knowledge analytics page with stats and query logs"
```

---

## Task 17: URL Recrawl in Cron Worker

**Files:**
- Modify: cron worker (check `apps/cron/` structure)

Add a recrawl check that runs periodically:
- Query documents where `recrawlEnabled = true`, `sourceType = 'url'`, `status = 'ready'`
- Filter for `lastCrawledAt + recrawlIntervalHours < now()`
- Enqueue ingestion jobs for each due document

- [ ] **Step 1: Add recrawl logic to cron worker**
- [ ] **Step 2: Commit**

```
git add -A && git commit -m "feat: add url recrawl cron job for scheduled document re-ingestion"
```

---

## Task 18: Type Check, Lint, and Verify

- [ ] **Step 1: Verify crypto import in embedder**

Ensure `apps/api/src/modules/knowledge/ingestion/embedder.ts` imports `decrypt` from the correct path (check existing usage in proxy modules).

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`

Fix any type errors.

- [ ] **Step 3: Run linter**

Run: `pnpm lint`

Fix any formatting issues.

- [ ] **Step 4: Commit fixes**

```
git add -A && git commit -m "fix: resolve type and lint errors for knowledge module"
```

---

## Task 19: Integration Verification

- [ ] **Step 1: Start Qdrant**

Run: `docker compose up qdrant -d`

- [ ] **Step 2: Run migrations**

Run: `pnpm db:migrate`

- [ ] **Step 3: Start dev servers**

Run: `pnpm dev`

- [ ] **Step 4: Verify API endpoints**

Test via curl:
- Create collection: `POST /v1/knowledge/collections`
- List collections: `GET /v1/knowledge/collections`
- Upload file: `POST /v1/knowledge/collections/:id/documents` (multipart)
- Ingest URL: `POST /v1/knowledge/collections/:id/documents/url`
- Search: `POST /v1/knowledge/search`
- RAG proxy: `POST /v1/chat/completions` with `X-Knowledge-Enabled: true`

- [ ] **Step 5: Verify dashboard**

Navigate to `http://localhost:3000/knowledge`:
- Create a collection
- Upload a document
- Wait for processing
- Test search
- Check analytics

- [ ] **Step 6: Final commit**

```
git add -A && git commit -m "feat: complete knowledge RAG platform integration"
```
