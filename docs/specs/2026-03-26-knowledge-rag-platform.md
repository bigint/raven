# Knowledge RAG Platform — Design Spec

## Overview

Knowledge is a RAG (Retrieval-Augmented Generation) module integrated into Raven. It allows companies to ingest documents, URLs, and images into a Qdrant vector database, then automatically inject retrieved context into LLM proxy calls with zero code changes — developers just swap their base URL.

The killer feature is transparent RAG injection in the existing proxy pipeline, configurable per virtual key and controllable via headers.

## Architecture

Knowledge integrates as new modules inside the existing Raven API (`apps/api/src/modules/knowledge/`), with new dashboard pages in the web app (`apps/web/src/app/(dashboard)/knowledge/`).

```
┌─────────────────────────────────────────────────────────┐
│                    Raven API (Hono)                      │
│                                                         │
│  Proxy Pipeline:                                        │
│  Auth → Rate Limit → Budget → Guardrails → Routing      │
│       → [RAG Injection] → Cache → Execute               │
│                                                         │
│  Knowledge Modules:                                     │
│  /v1/knowledge/collections     (CRUD collections)       │
│  /v1/knowledge/documents       (upload, list, delete)   │
│  /v1/knowledge/ingest/url      (URL scraping)           │
│  /v1/knowledge/ingest/image    (OCR extraction)         │
│  /v1/knowledge/search          (retrieval API)          │
│  /v1/admin/knowledge           (settings, analytics)    │
└─────────────┬───────────────────────────┬───────────────┘
              │                           │
              ▼                           ▼
         ┌─────────┐              ┌──────────────┐
         │ Qdrant  │              │  PostgreSQL   │
         │ (vectors│              │  (metadata,   │
         │  + meta)│              │   settings,   │
         └─────────┘              │   logs)       │
                                  └──────────────┘
```

The RAG injection step slots into the proxy pipeline between guardrails and cache check. When enabled, it extracts the last user message, embeds it, searches Qdrant, and prepends matched context as a system message.

## Data Model

### knowledge_collections

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | cuid2 | PK | |
| name | text | | unique |
| description | text | nullable | |
| embedding_model | text | `text-embedding-3-small` | |
| embedding_dimensions | int | 1536 | |
| chunk_strategy | enum | `hybrid` | `fixed`, `semantic`, `hybrid` |
| chunk_size | int | 512 | max tokens per chunk |
| chunk_overlap | int | 50 | overlap tokens |
| top_k | int | 5 | |
| similarity_threshold | float | 0.7 | |
| max_context_tokens | int | 4096 | budget cap for injected context |
| reranking_enabled | boolean | false | |
| is_default | boolean | false | used when no collection specified |
| is_enabled | boolean | true | |
| created_at | timestamp | now() | |
| updated_at | timestamp | now() | |

### knowledge_documents

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | cuid2 | PK | |
| collection_id | FK | | → knowledge_collections |
| title | text | | |
| source_type | enum | | `file`, `url`, `image` |
| source_url | text | nullable | for URLs and re-crawl |
| mime_type | text | | |
| file_size | int | nullable | |
| chunk_count | int | 0 | |
| token_count | int | 0 | |
| status | enum | `pending` | `pending`, `processing`, `ready`, `failed` |
| error_message | text | nullable | |
| recrawl_enabled | boolean | false | |
| recrawl_interval_hours | int | nullable | |
| last_crawled_at | timestamp | nullable | |
| metadata | jsonb | nullable | tags, custom fields |
| created_at | timestamp | now() | |
| updated_at | timestamp | now() | |

### knowledge_chunks

Lightweight records — actual vectors live in Qdrant.

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | cuid2 | PK | also used as Qdrant point ID |
| document_id | FK | | → knowledge_documents |
| collection_id | FK | | → knowledge_collections |
| chunk_index | int | | ordering within document |
| content | text | | raw chunk text for dashboard display |
| token_count | int | | |
| created_at | timestamp | now() | |

### knowledge_key_bindings

Links virtual keys to collections.

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | cuid2 | PK | |
| virtual_key_id | FK | | → virtual_keys |
| collection_id | FK | | → knowledge_collections |
| rag_enabled | boolean | true | per-key toggle |
| created_at | timestamp | now() | |

### knowledge_query_logs

RAG observability.

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | cuid2 | PK | |
| request_log_id | FK | nullable | → request_logs |
| collection_id | FK | | → knowledge_collections |
| query_text | text | | |
| chunks_retrieved | int | | |
| chunks_injected | int | | |
| top_similarity_score | float | | |
| total_context_tokens | int | | |
| chunk_ids | jsonb | | array of { id, score } |
| latency_ms | int | | |
| created_at | timestamp | now() | |

### Qdrant Storage

Each Qdrant collection maps 1:1 with `knowledge_collections.id`. Points have:
- `id`: chunk cuid2
- `vector`: embedding (dimensions match collection config)
- `payload`: `{ collection_id, document_id, chunk_index, content, metadata }`

## Ingestion Pipeline

Three ingestion paths, all async via Redis-based job queue.

### File Upload (PDF, Markdown, Plain Text, DOCX)

1. User uploads file via dashboard or `POST /v1/knowledge/collections/:id/documents`
2. File validated (type, size), stored temporarily on disk
3. Document record created with `status: pending`
4. Job queued → worker picks up:
   - PDF: extract text via `pdf-parse`
   - Markdown/Plain text: read directly
   - DOCX: extract via `mammoth`
5. Hybrid chunking: split on headers/paragraphs first, enforce `chunk_size` max with `chunk_overlap`
6. Embed all chunks via OpenAI embeddings API (batched, up to 2048 per request)
7. Upsert vectors to Qdrant collection
8. Save chunk records to Postgres
9. Update document `status: ready`, `chunk_count`, `token_count`

### URL Scraping

1. Admin submits URL via dashboard or `POST /v1/knowledge/collections/:id/documents/url`
2. Document record created with `source_type: url`
3. Job queued → worker:
   - Fetch page with `undici` (follows redirects, respects robots.txt)
   - Extract readable content via `@mozilla/readability` + `linkedom`
   - Same chunking → embedding → Qdrant pipeline
4. If `recrawl_enabled`, cron job re-processes at `recrawl_interval_hours`

### Image OCR

1. User uploads image via dashboard or `POST /v1/knowledge/collections/:id/documents/image`
2. Job queued → worker:
   - Send image to OpenAI GPT-4o vision: "Extract all text content from this image, preserving structure"
   - Requires OpenAI provider configured with a vision-capable model
   - Extracted text goes through same chunking → embedding pipeline

### Job Processing

- Redis-based job queue using reliable queue pattern (`BRPOPLPUSH`)
- Retry with exponential backoff (max 3 attempts)
- Status updates via Redis pub/sub
- Cron worker handles scheduled URL re-crawls

## RAG Proxy Injection

Hooks into the existing proxy pipeline between guardrails and cache check.

### Decision Logic

1. **Should RAG run?**
   - Header `X-Knowledge-Enabled: true` present? → yes
   - No header? → check virtual key bindings for `rag_enabled` collections
   - Global admin toggle `knowledge_enabled` is off? → skip
   - Request has no messages? → skip

2. **Target collection(s):**
   - Header `X-Knowledge-Collection: <name>` → use that collection
   - No header? → use all collections bound to this virtual key
   - No bindings? → use the default collection (`is_default: true`)
   - No default? → skip

3. **Extract query:** last user message text content

4. **Embed + search:**
   - Embed query via collection's configured embedding model
   - Search Qdrant with `top_k` and `similarity_threshold` from collection settings
   - If reranking enabled, rerank results via OpenAI

5. **Build context:**
   - Sort chunks by score descending
   - Accumulate until `max_context_tokens` budget hit
   - Format as system message:
     ```
     Use the following context to inform your response.
     If the context is not relevant, ignore it.

     ---
     [Source: doc_title]
     chunk_content
     ---
     ```

6. **Inject:** prepend as first system message before existing messages

7. **Log:** write to `knowledge_query_logs`, add response headers:
   - `X-Knowledge-Used: true`
   - `X-Knowledge-Chunks: <count>`

### Performance

- Embedding query: ~100-200ms
- Qdrant search: ~10-50ms
- Total RAG overhead: ~150-300ms per request
- Query embedding cache in Redis (5min TTL) for identical queries
- RAG runs in parallel with cache check and provider resolution where possible

## API Endpoints

### Collections (session auth + writer middleware)

- `GET /v1/knowledge/collections` — list all
- `POST /v1/knowledge/collections` — create
- `GET /v1/knowledge/collections/:id` — get with stats
- `PATCH /v1/knowledge/collections/:id` — update settings
- `DELETE /v1/knowledge/collections/:id` — cascade delete docs, chunks, Qdrant collection

### Documents (session auth + writer middleware)

- `GET /v1/knowledge/collections/:id/documents` — list documents
- `POST /v1/knowledge/collections/:id/documents` — upload file (multipart/form-data)
- `POST /v1/knowledge/collections/:id/documents/url` — ingest URL
- `POST /v1/knowledge/collections/:id/documents/image` — ingest image (multipart)
- `GET /v1/knowledge/documents/:id` — document detail with chunks
- `POST /v1/knowledge/documents/:id/reprocess` — re-chunk and re-embed
- `DELETE /v1/knowledge/documents/:id` — delete doc + chunks + vectors

### Retrieval (virtual key auth)

- `POST /v1/knowledge/search` — direct retrieval API
  - Body: `{ query, collection_id?, top_k?, threshold? }`
  - Returns: `{ chunks: [{ content, score, document_title, metadata }] }`

### Key Bindings (session auth + writer middleware)

- `GET /v1/keys/:id/collections` — list bound collections
- `PUT /v1/keys/:id/collections` — set bindings `[{ collection_id, rag_enabled }]`

### Analytics (admin auth)

- `GET /v1/admin/knowledge/analytics` — query stats, hit rates, top collections
- `GET /v1/admin/knowledge/query-logs` — paginated query log with chunk details

### Admin Settings

- `PATCH /v1/admin/settings` — existing endpoint extended with knowledge fields

## Dashboard UI

New pages under `(dashboard)/knowledge/` following existing patterns (TanStack Query, Zustand, Base UI, Tailwind).

### Collections Page — `/knowledge`
- Table: name, document count, chunk count, embedding model, status toggle
- Create collection modal: name, description, embedding model picker, chunking settings, retrieval params

### Collection Detail — `/knowledge/[id]`
- Overview tab: stats, settings edit
- Documents tab: document table with status badges, upload button, add URL button
- Search tab: test retrieval — paste query, see matched chunks with similarity scores

### Document Detail — `/knowledge/[id]/documents/[docId]`
- Source info (type, URL, file size, status)
- Chunk viewer: paginated list with content preview and token count
- Re-process button, delete button

### Upload Flow
- Drag-and-drop for files (PDF, MD, TXT, DOCX)
- URL input with optional recrawl toggle and interval
- Image upload with OCR status
- Processing progress indicator

### Key Bindings — integrated into existing `/keys` page
- New section when editing a virtual key: "Knowledge Collections"
- Multi-select to bind collections, toggle RAG enabled per binding

### Knowledge Analytics — `/knowledge/analytics`
- Query volume over time
- Average chunks per query, average similarity scores
- Top queried collections
- Chunk hit rate distribution

### Admin Settings — new tab under `/admin/settings`
- Global `knowledge_enabled` toggle
- Default collection settings

## Dependencies

### New npm packages for @raven/api

- `@qdrant/js-client-rest` — Qdrant client
- `openai` — OpenAI SDK for embeddings
- `pdf-parse` — PDF text extraction
- `mammoth` — DOCX text extraction
- `linkedom` — Lightweight DOM for HTML parsing
- `@mozilla/readability` — Article content extractor

### Infrastructure

- Qdrant added to `docker-compose.yml` (port 6333)
- OpenAI API key configured via existing Raven provider system
- Temporary disk space for file processing

### New environment variables

- `QDRANT_URL` (default: `http://localhost:6333`)
- `QDRANT_API_KEY` (optional, for Qdrant Cloud)

## Scope

### In scope (v1)
- Collections CRUD with configurable chunking/embedding/retrieval params
- File ingestion: PDF, plain text, Markdown, DOCX
- URL scraping with optional scheduled re-crawl
- Image OCR via OpenAI vision
- Hybrid chunking (semantic + max size enforcement)
- Configurable embedding models (default `text-embedding-3-small`)
- Proxy RAG injection with header + per-key control
- System message prepend strategy
- Retrieval API for manual RAG use
- Dashboard: collections, documents, chunk viewer, search testing, analytics
- Query logging with chunk-level visibility
- Context token budget to prevent prompt overflow
- Reranking option per collection
- Qdrant in docker-compose for self-hosting

### Not in scope (v2+)
- Per-key header overrides for retrieval params
- Additional embedding providers (Cohere, local models)
- Multi-modal retrieval (image similarity search)
- Conversation-aware retrieval (full history as query)
- Webhooks for ingestion events
- Bulk import (zip files, S3 bucket sync)
- Collection sharing across instances
- Graph-based RAG / knowledge graph
- Fine-tuning embedding models
- Code-aware / table-aware chunking
