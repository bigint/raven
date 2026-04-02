# bigRAG Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Raven's custom RAG backend (Qdrant + custom parsers/chunker/embedder) with bigRAG API calls, keeping Raven's UI, routing, key bindings, reranking, and analytics.

**Architecture:** Raven becomes a thin orchestration layer over bigRAG. Collections, documents, and vector search are proxied to bigRAG's REST API. Raven retains ownership of user auth, key bindings, query logging, reranking, and the RAG injection pipeline. URL crawling remains in Raven's cron worker (bigRAG doesn't crawl URLs), but crawled content is uploaded to bigRAG as markdown files. File and image uploads are proxied directly to bigRAG.

**Tech Stack:** Hono (API), Drizzle ORM (Postgres), bigRAG REST API (document processing + vector search + embeddings), Milvus (vector DB via bigRAG), Redis (caching + job queue)

---

## File Structure

### Files to Create

| File | Responsibility |
|------|---------------|
| `apps/api/src/lib/bigrag.ts` | Typed HTTP client wrapping bigRAG REST API |
| `packages/db/src/migrations/XXXX_bigrag_integration.ts` | Schema migration: add bigRAG mapping columns, drop chunks table |

### Files to Modify

| File | Changes |
|------|---------|
| `docker-compose.yml` | Remove Qdrant, add bigRAG + Milvus + bigRAG Postgres |
| `packages/config/src/env.ts` | Replace `QDRANT_URL`/`QDRANT_API_KEY` with `BIGRAG_URL`/`BIGRAG_API_KEY` |
| `packages/db/src/schema/knowledge.ts` | Add `bigragDocumentId` to documents, drop `knowledgeChunks` table |
| `packages/db/src/index.ts` | Remove `knowledgeChunks` export |
| `apps/api/src/index.ts` | Replace Qdrant client with bigRAG client, update module wiring |
| `apps/api/src/modules/knowledge/index.ts` | Change deps from Qdrant to bigRAG client |
| `apps/api/src/modules/knowledge/collections/index.ts` | Pass bigRAG client instead of Qdrant |
| `apps/api/src/modules/knowledge/collections/create.ts` | Sync-create bigRAG collection |
| `apps/api/src/modules/knowledge/collections/delete.ts` | Delete bigRAG collection instead of Qdrant |
| `apps/api/src/modules/knowledge/documents/index.ts` | Replace Qdrant dep with bigRAG client |
| `apps/api/src/modules/knowledge/documents/upload.ts` | Proxy file to bigRAG upload API |
| `apps/api/src/modules/knowledge/documents/ingest-url.ts` | Remove OpenAI provider check |
| `apps/api/src/modules/knowledge/documents/ingest-image.ts` | Proxy image to bigRAG upload API |
| `apps/api/src/modules/knowledge/documents/get.ts` | Fetch chunks from bigRAG API |
| `apps/api/src/modules/knowledge/documents/delete.ts` | Delete from bigRAG instead of Qdrant |
| `apps/api/src/modules/knowledge/documents/reprocess.ts` | Trigger bigRAG reprocess |
| `apps/api/src/modules/knowledge/search/index.ts` | Use bigRAG query API |
| `apps/api/src/modules/knowledge/rag/injection.ts` | Use bigRAG query instead of embed + Qdrant search |
| `apps/api/src/modules/openai-compat/index.ts` | Remove Qdrant param |
| `apps/api/src/modules/openai-compat/handler.ts` | Remove Qdrant param |
| `apps/api/src/modules/proxy/pipeline.ts` | Replace Qdrant with bigRAG client |
| `apps/cron/src/index.ts` | Replace Qdrant with bigRAG client, add status sync job |
| `apps/cron/src/knowledge/worker.ts` | Rewrite: URL crawl → upload to bigRAG, file/image → proxy to bigRAG |
| `apps/cron/src/jobs/recrawl.ts` | Keep as-is (just enqueues jobs) |
| `apps/api/package.json` | Remove `@qdrant/js-client-rest`, `openai` |
| `apps/cron/package.json` | Remove `@qdrant/js-client-rest`, `openai`, `pdf-parse`, `mammoth` |
| `.env.example` | Update env vars |

### Files to Delete

| File | Reason |
|------|--------|
| `apps/api/src/lib/qdrant.ts` | Replaced by bigRAG client |
| `apps/api/src/modules/knowledge/rag/qdrant.ts` | All vector ops now via bigRAG API |
| `apps/api/src/modules/knowledge/ingestion/embedder.ts` | bigRAG handles embedding |
| `apps/cron/src/knowledge/chunker.ts` | bigRAG handles chunking |
| `apps/cron/src/knowledge/embedder.ts` | bigRAG handles embedding |
| `apps/cron/src/knowledge/qdrant.ts` | Replaced by bigRAG API |
| `apps/cron/src/knowledge/parsers/pdf.ts` | bigRAG uses Docling for parsing |
| `apps/cron/src/knowledge/parsers/docx.ts` | bigRAG uses Docling for parsing |
| `apps/cron/src/knowledge/parsers/image.ts` | bigRAG uses Docling for parsing |
| `apps/cron/src/knowledge/parsers/markdown.ts` | bigRAG uses Docling for parsing |

### Files to Keep (unchanged)

| File | Reason |
|------|--------|
| `apps/api/src/modules/knowledge/rag/reranker.ts` | Reranking stays in Raven (bigRAG doesn't rerank) |
| `apps/api/src/modules/knowledge/key-bindings/` | Raven-specific feature |
| `apps/api/src/modules/knowledge/analytics/` | Raven-specific analytics |
| `apps/cron/src/knowledge/parsers/url.ts` | URL crawling stays in Raven |
| `apps/cron/src/knowledge/queue.ts` | Still needed for URL crawl jobs |
| `packages/db/src/schema/knowledge.ts` (partial) | `knowledgeQueryLogs`, `knowledgeKeyBindings` unchanged |

---

## Task 1: Create bigRAG HTTP Client

**Files:**
- Create: `apps/api/src/lib/bigrag.ts`

This is the foundation — a typed HTTP client that all other tasks depend on.

- [ ] **Step 1: Create the bigRAG client module**

```typescript
// apps/api/src/lib/bigrag.ts

interface BigRAGCollection {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly embedding_provider: string;
  readonly embedding_model: string;
  readonly dimension: number;
  readonly chunk_size: number;
  readonly chunk_overlap: number;
  readonly document_count: number;
  readonly metadata: Record<string, unknown>;
  readonly created_at: string;
  readonly updated_at: string;
}

interface BigRAGDocument {
  readonly id: string;
  readonly collection_id: string;
  readonly filename: string;
  readonly file_type: string;
  readonly file_size: number;
  readonly chunk_count: number;
  readonly status: "pending" | "processing" | "ready" | "failed";
  readonly error_message: string | null;
  readonly metadata: Record<string, unknown>;
  readonly created_at: string;
  readonly updated_at: string;
}

interface BigRAGChunk {
  readonly id: string;
  readonly text: string;
  readonly chunk_index: number;
  readonly metadata: Record<string, unknown>;
}

interface BigRAGQueryResult {
  readonly id: string;
  readonly text: string;
  readonly score: number;
  readonly document_id: string;
  readonly chunk_index: number;
  readonly metadata: Record<string, unknown>;
}

interface BigRAGQueryResponse {
  readonly results: BigRAGQueryResult[];
  readonly query: string;
  readonly collection: string;
  readonly total: number;
}

interface CreateCollectionInput {
  readonly name: string;
  readonly description?: string;
  readonly embedding_provider?: string;
  readonly embedding_model?: string;
  readonly dimension?: number;
  readonly chunk_size?: number;
  readonly chunk_overlap?: number;
  readonly metadata?: Record<string, unknown>;
}

interface QueryInput {
  readonly query: string;
  readonly top_k?: number;
  readonly filters?: Record<string, unknown>;
  readonly min_score?: number;
}

export class BigRAGClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`
    };
    if (body && !(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }
    const response = await fetch(`${this.baseUrl}${path}`, {
      body:
        body instanceof FormData
          ? body
          : body
            ? JSON.stringify(body)
            : undefined,
      headers:
        body instanceof FormData
          ? { Authorization: `Bearer ${this.apiKey}` }
          : headers,
      method
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `bigRAG API error ${response.status}: ${text}`
      );
    }
    return response.json() as Promise<T>;
  }

  async health(): Promise<{ status: string; version: string }> {
    return this.request("GET", "/health");
  }

  async createCollection(
    input: CreateCollectionInput
  ): Promise<BigRAGCollection> {
    return this.request("POST", "/v1/collections", input);
  }

  async deleteCollection(name: string): Promise<void> {
    await this.request("DELETE", `/v1/collections/${encodeURIComponent(name)}`);
  }

  async uploadDocument(
    collectionName: string,
    file: Blob,
    filename: string,
    metadata?: Record<string, unknown>
  ): Promise<BigRAGDocument> {
    const form = new FormData();
    form.append("file", file, filename);
    if (metadata) {
      form.append("metadata", JSON.stringify(metadata));
    }
    return this.request(
      "POST",
      `/v1/collections/${encodeURIComponent(collectionName)}/documents`,
      form
    );
  }

  async uploadDocumentFromPath(
    collectionName: string,
    filePath: string,
    metadata?: Record<string, unknown>
  ): Promise<BigRAGDocument> {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const buffer = fs.readFileSync(filePath);
    const filename = path.basename(filePath);
    const blob = new Blob([buffer]);
    return this.uploadDocument(collectionName, blob, filename, metadata);
  }

  async getDocument(
    collectionName: string,
    documentId: string
  ): Promise<BigRAGDocument> {
    return this.request(
      "GET",
      `/v1/collections/${encodeURIComponent(collectionName)}/documents/${documentId}`
    );
  }

  async deleteDocument(
    collectionName: string,
    documentId: string
  ): Promise<void> {
    await this.request(
      "DELETE",
      `/v1/collections/${encodeURIComponent(collectionName)}/documents/${documentId}`
    );
  }

  async reprocessDocument(
    collectionName: string,
    documentId: string
  ): Promise<void> {
    await this.request(
      "POST",
      `/v1/collections/${encodeURIComponent(collectionName)}/documents/${documentId}/reprocess`
    );
  }

  async getDocumentChunks(
    collectionName: string,
    documentId: string
  ): Promise<{ chunks: BigRAGChunk[]; total: number }> {
    return this.request(
      "GET",
      `/v1/collections/${encodeURIComponent(collectionName)}/documents/${documentId}/chunks`
    );
  }

  async query(
    collectionName: string,
    input: QueryInput
  ): Promise<BigRAGQueryResponse> {
    return this.request(
      "POST",
      `/v1/collections/${encodeURIComponent(collectionName)}/query`,
      input
    );
  }
}

let client: BigRAGClient | null = null;

export const getBigRAG = (baseUrl: string, apiKey: string): BigRAGClient => {
  if (!client) {
    client = new BigRAGClient(baseUrl, apiKey);
  }
  return client;
};

export type {
  BigRAGChunk,
  BigRAGCollection,
  BigRAGDocument,
  BigRAGQueryResponse,
  BigRAGQueryResult
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/lib/bigrag.ts
git commit -m "feat: add bigRAG HTTP client"
```

---

## Task 2: Update Environment Configuration

**Files:**
- Modify: `packages/config/src/env.ts`

- [ ] **Step 1: Replace Qdrant env vars with bigRAG env vars**

In `packages/config/src/env.ts`, replace:

```typescript
  QDRANT_API_KEY: z.string().optional(),
  QDRANT_URL: z.string().url().default("http://localhost:6333"),
```

With:

```typescript
  BIGRAG_API_KEY: z.string(),
  BIGRAG_URL: z.string().url().default("http://localhost:8080"),
```

- [ ] **Step 2: Commit**

```bash
git add packages/config/src/env.ts
git commit -m "feat: replace Qdrant env vars with bigRAG"
```

---

## Task 3: Update Docker Compose

**Files:**
- Modify: `docker-compose.yml`

- [ ] **Step 1: Replace Qdrant with bigRAG stack**

Replace the entire `docker-compose.yml` with:

```yaml
services:
  raven:
    image: yoginth/raven:latest
    ports:
      - "3000:3000"
      - "4000:4000"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      BIGRAG_URL: http://bigrag:8080
      BIGRAG_API_KEY: ${BIGRAG_MASTER_KEY:-raven-bigrag-key}
    restart: unless-stopped

  bigrag:
    image: bigrag/bigrag:latest
    ports:
      - "8080:8080"
    environment:
      BIGRAG_DATABASE_URL: postgres://bigrag:bigrag@bigrag-postgres:5432/bigrag?sslmode=disable
      BIGRAG_MILVUS_URI: http://milvus:19530
      BIGRAG_REDIS_URL: redis://bigrag-redis:6379/0
      BIGRAG_MASTER_KEY: ${BIGRAG_MASTER_KEY:-raven-bigrag-key}
      BIGRAG_EMBEDDING_PROVIDER: ${BIGRAG_EMBEDDING_PROVIDER:-openai}
      BIGRAG_EMBEDDING_MODEL: ${BIGRAG_EMBEDDING_MODEL:-text-embedding-3-small}
      BIGRAG_EMBEDDING_API_KEY: ${BIGRAG_EMBEDDING_API_KEY}
      BIGRAG_LOG_LEVEL: info
    depends_on:
      - bigrag-postgres
      - milvus
      - bigrag-redis
    restart: unless-stopped

  bigrag-postgres:
    image: postgres:17
    environment:
      POSTGRES_USER: bigrag
      POSTGRES_PASSWORD: bigrag
      POSTGRES_DB: bigrag
    volumes:
      - bigrag_postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  milvus:
    image: milvusdb/milvus:latest
    volumes:
      - milvus_data:/var/lib/milvus
    restart: unless-stopped

  bigrag-redis:
    image: redis:7-alpine
    volumes:
      - bigrag_redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  bigrag_postgres_data:
  milvus_data:
  bigrag_redis_data:
```

- [ ] **Step 2: Commit**

```bash
git add docker-compose.yml
git commit -m "feat: replace Qdrant with bigRAG stack in docker-compose"
```

---

## Task 4: Update Database Schema

**Files:**
- Modify: `packages/db/src/schema/knowledge.ts`
- Modify: `packages/db/src/index.ts` (remove `knowledgeChunks` export)

- [ ] **Step 1: Add `bigragDocumentId` to documents, remove `knowledgeChunks` table**

In `packages/db/src/schema/knowledge.ts`:

1. Add `bigragDocumentId` column to `knowledgeDocuments`:

After the `fileSize` field, add:

```typescript
    bigragDocumentId: text("bigrag_document_id"),
```

2. Remove the entire `knowledgeChunks` table definition and its import usage. Delete:

```typescript
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
```

3. Remove `chunkStrategyEnum` (no longer needed — bigRAG handles chunking strategy):

```typescript
export const chunkStrategyEnum = pgEnum("chunk_strategy", [
  "fixed",
  "semantic",
  "hybrid"
]);
```

4. In `knowledgeCollections`, remove the `chunkStrategy` field:

```typescript
    chunkStrategy: chunkStrategyEnum("chunk_strategy")
      .notNull()
      .default("hybrid"),
```

- [ ] **Step 2: Update `packages/db/src/index.ts`**

Remove the `knowledgeChunks` export. Search for `knowledgeChunks` and remove it from the export list. Also remove `chunkStrategyEnum` if exported.

- [ ] **Step 3: Generate a Drizzle migration**

```bash
cd /Users/yoginth/raven && pnpm --filter @raven/db drizzle-kit generate
```

- [ ] **Step 4: Commit**

```bash
git add packages/db/
git commit -m "feat: add bigragDocumentId, drop knowledgeChunks table"
```

---

## Task 5: Update Collection Create & Delete

**Files:**
- Modify: `apps/api/src/modules/knowledge/collections/create.ts`
- Modify: `apps/api/src/modules/knowledge/collections/delete.ts`
- Modify: `apps/api/src/modules/knowledge/collections/index.ts`

- [ ] **Step 1: Update `collections/create.ts` to sync-create a bigRAG collection**

Replace the entire file:

```typescript
// apps/api/src/modules/knowledge/collections/create.ts
import type { Database } from "@raven/db";
import { knowledgeCollections } from "@raven/db";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import { auditAndPublish } from "@/lib/audit";
import type { BigRAGClient } from "@/lib/bigrag";
import { ConflictError } from "@/lib/errors";
import { log } from "@/lib/logger";
import { created } from "@/lib/response";
import type { AuthContextWithJson } from "@/lib/types";
import type { createCollectionSchema } from "./schema";

type Body = z.infer<typeof createCollectionSchema>;

export const createCollection =
  (db: Database, bigrag: BigRAGClient) =>
  async (c: AuthContextWithJson<Body>) => {
    const user = c.get("user");
    const body = c.req.valid("json");

    if (body.isDefault) {
      await db
        .update(knowledgeCollections)
        .set({ isDefault: false })
        .where(eq(knowledgeCollections.isDefault, true));
    }

    let record: typeof knowledgeCollections.$inferSelect;
    try {
      const [inserted] = await db
        .insert(knowledgeCollections)
        .values(body)
        .returning();
      record = inserted as NonNullable<typeof inserted>;
    } catch (err) {
      const error = err as { code?: string };
      if (error.code === "23505") {
        throw new ConflictError("A collection with that name already exists");
      }
      throw err;
    }

    // Create matching collection in bigRAG
    try {
      await bigrag.createCollection({
        chunk_overlap: record.chunkOverlap,
        chunk_size: record.chunkSize,
        description: record.description ?? "",
        dimension: record.embeddingDimensions,
        embedding_model: record.embeddingModel,
        name: record.name
      });
    } catch (err) {
      log.error("Failed to create bigRAG collection", err);
      // Roll back the Raven record on bigRAG failure
      await db
        .delete(knowledgeCollections)
        .where(eq(knowledgeCollections.id, record.id));
      throw err;
    }

    void auditAndPublish(db, user, "collection", "created", {
      data: record,
      metadata: { name: body.name },
      resourceId: record.id
    });
    return created(c, record);
  };
```

- [ ] **Step 2: Update `collections/delete.ts` to delete bigRAG collection**

Replace the entire file:

```typescript
// apps/api/src/modules/knowledge/collections/delete.ts
import type { Database } from "@raven/db";
import { knowledgeCollections } from "@raven/db";
import { eq } from "drizzle-orm";
import { auditAndPublish } from "@/lib/audit";
import type { BigRAGClient } from "@/lib/bigrag";
import { NotFoundError } from "@/lib/errors";
import { log } from "@/lib/logger";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

export const deleteCollection =
  (db: Database, bigrag: BigRAGClient) => async (c: AuthContext) => {
    const user = c.get("user");
    const id = c.req.param("id") as string;

    const [deleted] = await db
      .delete(knowledgeCollections)
      .where(eq(knowledgeCollections.id, id))
      .returning({
        id: knowledgeCollections.id,
        name: knowledgeCollections.name
      });

    if (!deleted) {
      throw new NotFoundError("Collection not found");
    }

    // Fire and forget — remove bigRAG collection in the background
    void bigrag.deleteCollection(deleted.name).catch((err) => {
      log.error("Failed to delete bigRAG collection", err);
    });

    void auditAndPublish(db, user, "collection", "deleted", {
      resourceId: id
    });
    return success(c, { success: true });
  };
```

- [ ] **Step 3: Update `collections/index.ts` to accept bigRAG client**

Replace the entire file:

```typescript
// apps/api/src/modules/knowledge/collections/index.ts
import type { Database } from "@raven/db";
import { Hono } from "hono";
import type { BigRAGClient } from "@/lib/bigrag";
import { jsonValidator } from "@/lib/validation";
import { createCollection } from "./create";
import { deleteCollection } from "./delete";
import { getCollection } from "./get";
import { listCollections } from "./list";
import { createCollectionSchema, updateCollectionSchema } from "./schema";
import { updateCollection } from "./update";

export const createCollectionsModule = (
  db: Database,
  bigrag: BigRAGClient
) => {
  const app = new Hono();

  app.get("/", listCollections(db));
  app.post(
    "/",
    jsonValidator(createCollectionSchema),
    createCollection(db, bigrag)
  );
  app.get("/:id", getCollection(db));
  app.patch(
    "/:id",
    jsonValidator(updateCollectionSchema),
    updateCollection(db)
  );
  app.delete("/:id", deleteCollection(db, bigrag));

  return app;
};
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/knowledge/collections/
git commit -m "feat: sync collection create/delete with bigRAG"
```

---

## Task 6: Update Document Upload (File + Image)

**Files:**
- Modify: `apps/api/src/modules/knowledge/documents/upload.ts`
- Modify: `apps/api/src/modules/knowledge/documents/ingest-image.ts`

For file and image uploads, proxy directly to bigRAG instead of saving locally and enqueuing to Redis. bigRAG handles parsing, chunking, and embedding.

- [ ] **Step 1: Rewrite `documents/upload.ts`**

```typescript
// apps/api/src/modules/knowledge/documents/upload.ts
import type { Database } from "@raven/db";
import { knowledgeCollections, knowledgeDocuments } from "@raven/db";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import type { BigRAGClient } from "@/lib/bigrag";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { created } from "@/lib/response";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/html",
  "text/markdown",
  "text/plain",
  "text/xml"
]);

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB (bigRAG default)

export const uploadDocument =
  (db: Database, bigrag: BigRAGClient) => async (c: Context) => {
    const collectionId = c.req.param("id") as string;

    const [collection] = await db
      .select()
      .from(knowledgeCollections)
      .where(eq(knowledgeCollections.id, collectionId))
      .limit(1);

    if (!collection) {
      throw new NotFoundError("Collection not found");
    }

    const body = await c.req.parseBody();
    const file = body["file"];

    if (!file || typeof file === "string") {
      throw new ValidationError("A file must be provided");
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      throw new ValidationError(
        "Unsupported file type. Allowed: PDF, DOCX, PPTX, XLSX, HTML, Markdown, plain text, CSV, XML"
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new ValidationError("File exceeds the 500MB size limit");
    }

    const title = (body["title"] as string | undefined) ?? file.name;

    // Upload to bigRAG
    const blob = new Blob([await file.arrayBuffer()], { type: file.type });
    const bigragDoc = await bigrag.uploadDocument(
      collection.name,
      blob,
      file.name
    );

    // Store reference in Raven
    const [document] = await db
      .insert(knowledgeDocuments)
      .values({
        bigragDocumentId: bigragDoc.id,
        collectionId,
        fileSize: file.size,
        mimeType: file.type,
        sourceType: "file",
        status: "processing",
        title
      })
      .returning();

    return created(c, document);
  };
```

- [ ] **Step 2: Rewrite `documents/ingest-image.ts`**

```typescript
// apps/api/src/modules/knowledge/documents/ingest-image.ts
import type { Database } from "@raven/db";
import { knowledgeCollections, knowledgeDocuments } from "@raven/db";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import type { BigRAGClient } from "@/lib/bigrag";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { created } from "@/lib/response";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/gif",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/tiff",
  "image/webp"
]);

const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB

export const ingestImage =
  (db: Database, bigrag: BigRAGClient) => async (c: Context) => {
    const collectionId = c.req.param("id") as string;

    const [collection] = await db
      .select()
      .from(knowledgeCollections)
      .where(eq(knowledgeCollections.id, collectionId))
      .limit(1);

    if (!collection) {
      throw new NotFoundError("Collection not found");
    }

    const body = await c.req.parseBody();
    const file = body["file"];

    if (!file || typeof file === "string") {
      throw new ValidationError("An image file must be provided");
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      throw new ValidationError(
        "Unsupported image type. Allowed: PNG, JPEG, GIF, TIFF, WebP"
      );
    }

    if (file.size > MAX_IMAGE_SIZE) {
      throw new ValidationError("Image exceeds the 20MB size limit");
    }

    const title = (body["title"] as string | undefined) ?? file.name;

    // Upload to bigRAG (Docling handles OCR)
    const blob = new Blob([await file.arrayBuffer()], { type: file.type });
    const bigragDoc = await bigrag.uploadDocument(
      collection.name,
      blob,
      file.name
    );

    const [document] = await db
      .insert(knowledgeDocuments)
      .values({
        bigragDocumentId: bigragDoc.id,
        collectionId,
        fileSize: file.size,
        mimeType: file.type,
        sourceType: "image",
        status: "processing",
        title
      })
      .returning();

    return created(c, document);
  };
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/knowledge/documents/upload.ts apps/api/src/modules/knowledge/documents/ingest-image.ts
git commit -m "feat: proxy file and image uploads to bigRAG"
```

---

## Task 7: Update Document URL Ingestion

**Files:**
- Modify: `apps/api/src/modules/knowledge/documents/ingest-url.ts`

URL ingestion still uses the Redis queue (crawling is slow), but we remove the OpenAI provider check since bigRAG handles embedding.

- [ ] **Step 1: Update `ingest-url.ts`**

Remove the `hasOpenAIProvider` check and its import. The file becomes:

```typescript
// apps/api/src/modules/knowledge/documents/ingest-url.ts
import { createId } from "@paralleldrive/cuid2";
import type { Database } from "@raven/db";
import { knowledgeDocuments } from "@raven/db";
import type { Redis } from "ioredis";
import type { z } from "zod";
import { created } from "@/lib/response";
import type { AuthContextWithJson } from "@/lib/types";
import { enqueueJob } from "../ingestion/queue";
import type { ingestUrlSchema } from "./schema";

type Body = z.infer<typeof ingestUrlSchema>;

export const ingestUrl =
  (db: Database, redis: Redis) => async (c: AuthContextWithJson<Body>) => {
    const collectionId = c.req.param("id") as string;

    const body = c.req.valid("json");

    const [document] = await db
      .insert(knowledgeDocuments)
      .values({
        collectionId,
        metadata: { crawlLimit: body.crawlLimit },
        mimeType: "text/html",
        recrawlEnabled: body.recrawlEnabled,
        recrawlIntervalHours: body.recrawlIntervalHours,
        sourceType: "url",
        sourceUrl: body.url,
        title: body.title ?? body.url
      })
      .returning();

    await enqueueJob(redis, {
      collectionId,
      documentId: (document as NonNullable<typeof document>).id,
      id: createId(),
      sourceUrl: body.url,
      type: "url"
    });

    return created(c, document);
  };
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/modules/knowledge/documents/ingest-url.ts
git commit -m "feat: remove OpenAI provider check from URL ingestion"
```

---

## Task 8: Update Document Get, Delete, Reprocess

**Files:**
- Modify: `apps/api/src/modules/knowledge/documents/get.ts`
- Modify: `apps/api/src/modules/knowledge/documents/delete.ts`
- Modify: `apps/api/src/modules/knowledge/documents/reprocess.ts`

- [ ] **Step 1: Rewrite `documents/get.ts` — fetch chunks from bigRAG**

```typescript
// apps/api/src/modules/knowledge/documents/get.ts
import type { Database } from "@raven/db";
import { knowledgeCollections, knowledgeDocuments } from "@raven/db";
import { eq } from "drizzle-orm";
import type { BigRAGClient } from "@/lib/bigrag";
import { NotFoundError } from "@/lib/errors";
import { log } from "@/lib/logger";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

/** GET /documents/:id — document metadata only (no chunks) */
export const getDocument = (db: Database) => async (c: AuthContext) => {
  const docId = c.req.param("id") as string;

  const [document] = await db
    .select()
    .from(knowledgeDocuments)
    .where(eq(knowledgeDocuments.id, docId))
    .limit(1);

  if (!document) {
    throw new NotFoundError("Document not found");
  }

  return success(c, document);
};

/** GET /documents/:id/chunks?limit=20&offset=0 — paginated chunks from bigRAG */
export const getDocumentChunks =
  (db: Database, bigrag: BigRAGClient) => async (c: AuthContext) => {
    const docId = c.req.param("id") as string;

    const [document] = await db
      .select({
        bigragDocumentId: knowledgeDocuments.bigragDocumentId,
        collectionId: knowledgeDocuments.collectionId,
        id: knowledgeDocuments.id
      })
      .from(knowledgeDocuments)
      .where(eq(knowledgeDocuments.id, docId))
      .limit(1);

    if (!document) {
      throw new NotFoundError("Document not found");
    }

    if (!document.bigragDocumentId) {
      return success(c, { chunks: [], total: 0 });
    }

    const [collection] = await db
      .select({ name: knowledgeCollections.name })
      .from(knowledgeCollections)
      .where(eq(knowledgeCollections.id, document.collectionId))
      .limit(1);

    if (!collection) {
      return success(c, { chunks: [], total: 0 });
    }

    try {
      const result = await bigrag.getDocumentChunks(
        collection.name,
        document.bigragDocumentId
      );

      // Apply limit/offset on our side (bigRAG returns all chunks)
      const limit = Math.min(Number(c.req.query("limit") ?? "20"), 100);
      const offset = Number(c.req.query("offset") ?? "0");
      const chunks = result.chunks.slice(offset, offset + limit).map((ch) => ({
        chunkIndex: ch.chunk_index,
        content: ch.text,
        id: ch.id,
        metadata: ch.metadata
      }));

      return success(c, { chunks, total: result.total });
    } catch (err) {
      log.error("Failed to fetch chunks from bigRAG", err);
      return success(c, { chunks: [], total: 0 });
    }
  };
```

- [ ] **Step 2: Rewrite `documents/delete.ts` — delete from bigRAG**

```typescript
// apps/api/src/modules/knowledge/documents/delete.ts
import type { Database } from "@raven/db";
import { knowledgeCollections, knowledgeDocuments } from "@raven/db";
import { eq } from "drizzle-orm";
import { auditAndPublish } from "@/lib/audit";
import type { BigRAGClient } from "@/lib/bigrag";
import { NotFoundError } from "@/lib/errors";
import { log } from "@/lib/logger";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";

export const deleteDocument =
  (db: Database, bigrag: BigRAGClient) => async (c: AuthContext) => {
    const user = c.get("user");
    const docId = c.req.param("id") as string;

    const [deleted] = await db
      .delete(knowledgeDocuments)
      .where(eq(knowledgeDocuments.id, docId))
      .returning({
        bigragDocumentId: knowledgeDocuments.bigragDocumentId,
        collectionId: knowledgeDocuments.collectionId,
        id: knowledgeDocuments.id,
        title: knowledgeDocuments.title
      });

    if (!deleted) {
      throw new NotFoundError("Document not found");
    }

    // Fire and forget — remove document from bigRAG
    if (deleted.bigragDocumentId) {
      const [collection] = await db
        .select({ name: knowledgeCollections.name })
        .from(knowledgeCollections)
        .where(eq(knowledgeCollections.id, deleted.collectionId))
        .limit(1);

      if (collection) {
        void bigrag
          .deleteDocument(collection.name, deleted.bigragDocumentId)
          .catch((err) => {
            log.error("Failed to delete document from bigRAG", err);
          });
      }
    }

    void auditAndPublish(db, user, "document", "deleted", {
      metadata: { title: deleted.title },
      resourceId: deleted.id
    });

    return success(c, { success: true });
  };
```

- [ ] **Step 3: Rewrite `documents/reprocess.ts` — trigger bigRAG reprocess**

```typescript
// apps/api/src/modules/knowledge/documents/reprocess.ts
import { createId } from "@paralleldrive/cuid2";
import type { Database } from "@raven/db";
import { knowledgeCollections, knowledgeDocuments } from "@raven/db";
import { eq } from "drizzle-orm";
import type { Redis } from "ioredis";
import type { BigRAGClient } from "@/lib/bigrag";
import { NotFoundError } from "@/lib/errors";
import { log } from "@/lib/logger";
import { success } from "@/lib/response";
import type { AuthContext } from "@/lib/types";
import { enqueueJob } from "../ingestion/queue";

export const reprocessDocument =
  (db: Database, redis: Redis, bigrag: BigRAGClient) =>
  async (c: AuthContext) => {
    const docId = c.req.param("id") as string;

    const [document] = await db
      .select()
      .from(knowledgeDocuments)
      .where(eq(knowledgeDocuments.id, docId))
      .limit(1);

    if (!document) {
      throw new NotFoundError("Document not found");
    }

    // URL documents go through the crawl queue
    if (document.sourceType === "url") {
      await db
        .update(knowledgeDocuments)
        .set({
          chunkCount: 0,
          errorMessage: null,
          status: "pending",
          tokenCount: 0
        })
        .where(eq(knowledgeDocuments.id, docId));

      await enqueueJob(redis, {
        collectionId: document.collectionId,
        documentId: docId,
        id: createId(),
        sourceUrl: document.sourceUrl ?? undefined,
        type: "url"
      });

      return success(c, { success: true });
    }

    // File/image documents: trigger bigRAG reprocess
    if (document.bigragDocumentId) {
      const [collection] = await db
        .select({ name: knowledgeCollections.name })
        .from(knowledgeCollections)
        .where(eq(knowledgeCollections.id, document.collectionId))
        .limit(1);

      if (collection) {
        try {
          await bigrag.reprocessDocument(
            collection.name,
            document.bigragDocumentId
          );
          await db
            .update(knowledgeDocuments)
            .set({
              chunkCount: 0,
              errorMessage: null,
              status: "processing",
              tokenCount: 0
            })
            .where(eq(knowledgeDocuments.id, docId));
        } catch (err) {
          log.error("Failed to trigger bigRAG reprocess", err);
          throw err;
        }
      }
    }

    return success(c, { success: true });
  };
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/knowledge/documents/get.ts apps/api/src/modules/knowledge/documents/delete.ts apps/api/src/modules/knowledge/documents/reprocess.ts
git commit -m "feat: wire document get/delete/reprocess to bigRAG"
```

---

## Task 9: Update Documents Module Wiring

**Files:**
- Modify: `apps/api/src/modules/knowledge/documents/index.ts`

- [ ] **Step 1: Replace Qdrant with bigRAG in document module wiring**

```typescript
// apps/api/src/modules/knowledge/documents/index.ts
import type { Database } from "@raven/db";
import { Hono } from "hono";
import type { Redis } from "ioredis";
import type { BigRAGClient } from "@/lib/bigrag";
import { jsonValidator, queryValidator } from "@/lib/validation";
import { deleteDocument } from "./delete";
import { getDocument, getDocumentChunks } from "./get";
import { ingestImage } from "./ingest-image";
import { ingestUrl } from "./ingest-url";
import { listDocuments } from "./list";
import { reprocessDocument } from "./reprocess";
import { ingestUrlSchema, listDocumentsQuerySchema } from "./schema";
import { uploadDocument } from "./upload";

export const createDocumentsModule = (
  db: Database,
  redis: Redis,
  bigrag: BigRAGClient
) => {
  const app = new Hono();

  app.get("/", queryValidator(listDocumentsQuerySchema), listDocuments(db));
  app.post("/", uploadDocument(db, bigrag));
  app.post("/url", jsonValidator(ingestUrlSchema), ingestUrl(db, redis));
  app.post("/image", ingestImage(db, bigrag));

  return app;
};

export const createDocumentDetailModule = (
  db: Database,
  redis: Redis,
  bigrag: BigRAGClient
) => {
  const app = new Hono();

  app.get("/:id", getDocument(db));
  app.get("/:id/chunks", getDocumentChunks(db, bigrag));
  app.post("/:id/reprocess", reprocessDocument(db, redis, bigrag));
  app.delete("/:id", deleteDocument(db, bigrag));

  return app;
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/modules/knowledge/documents/index.ts
git commit -m "feat: wire documents module to bigRAG client"
```

---

## Task 10: Update Search Module

**Files:**
- Modify: `apps/api/src/modules/knowledge/search/index.ts`

- [ ] **Step 1: Rewrite search to use bigRAG query API**

```typescript
// apps/api/src/modules/knowledge/search/index.ts
import type { Database } from "@raven/db";
import { knowledgeCollections, knowledgeDocuments } from "@raven/db";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import type { z } from "zod";
import type { BigRAGClient } from "@/lib/bigrag";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { success } from "@/lib/response";
import type { AuthContextWithJson } from "@/lib/types";
import { jsonValidator } from "@/lib/validation";
import { searchSchema } from "./schema";

type SearchInput = z.infer<typeof searchSchema>;

export const createSearchModule = (db: Database, bigrag: BigRAGClient) => {
  const app = new Hono();

  app.post(
    "/",
    jsonValidator(searchSchema),
    async (c: AuthContextWithJson<SearchInput>) => {
      const { collectionId, query, threshold, topK } = c.req.valid("json");

      let collection: typeof knowledgeCollections.$inferSelect | undefined;

      if (collectionId) {
        const [found] = await db
          .select()
          .from(knowledgeCollections)
          .where(eq(knowledgeCollections.id, collectionId))
          .limit(1);
        collection = found;
      } else {
        const [found] = await db
          .select()
          .from(knowledgeCollections)
          .where(eq(knowledgeCollections.isDefault, true))
          .limit(1);
        collection = found;
      }

      if (!collection) {
        throw new NotFoundError("Collection not found");
      }

      if (!collection.isEnabled) {
        throw new ValidationError("Collection is disabled");
      }

      const minScore = threshold ?? collection.similarityThreshold;
      const limit = topK ?? collection.topK;

      const result = await bigrag.query(collection.name, {
        min_score: minScore,
        query,
        top_k: limit
      });

      // Enrich with Raven document titles
      const documentIds = [
        ...new Set(result.results.map((r) => r.document_id))
      ];

      const documents =
        documentIds.length > 0
          ? await db
              .select({
                id: knowledgeDocuments.id,
                title: knowledgeDocuments.title
              })
              .from(knowledgeDocuments)
              .where(eq(knowledgeDocuments.collectionId, collection.id))
          : [];

      // Map bigRAG document IDs to Raven document IDs via bigragDocumentId
      const ravenDocs = documents;
      const allRavenDocs = await db
        .select({
          bigragDocumentId: knowledgeDocuments.bigragDocumentId,
          id: knowledgeDocuments.id,
          title: knowledgeDocuments.title
        })
        .from(knowledgeDocuments)
        .where(eq(knowledgeDocuments.collectionId, collection.id));

      const bigragToRaven = new Map(
        allRavenDocs
          .filter((d) => d.bigragDocumentId)
          .map((d) => [d.bigragDocumentId!, { id: d.id, title: d.title }])
      );

      const chunks = result.results.map((r) => {
        const ravenDoc = bigragToRaven.get(r.document_id);
        return {
          chunkIndex: r.chunk_index,
          content: r.text,
          documentId: ravenDoc?.id ?? r.document_id,
          documentTitle: ravenDoc?.title ?? null,
          id: r.id,
          metadata: r.metadata,
          score: r.score
        };
      });

      return success(c, { chunks, collectionId: collection.id });
    }
  );

  return app;
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/modules/knowledge/search/
git commit -m "feat: rewrite search module to use bigRAG query API"
```

---

## Task 11: Update RAG Injection Pipeline

**Files:**
- Modify: `apps/api/src/modules/knowledge/rag/injection.ts`

This is the critical path — RAG injection during chat completions. Replace embed + Qdrant search with bigRAG query calls.

- [ ] **Step 1: Rewrite injection.ts**

```typescript
// apps/api/src/modules/knowledge/rag/injection.ts
import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import {
  knowledgeCollections,
  knowledgeDocuments,
  knowledgeKeyBindings,
  knowledgeQueryLogs
} from "@raven/db";
import { and, eq, inArray } from "drizzle-orm";
import type { BigRAGClient } from "@/lib/bigrag";
import { log } from "@/lib/logger";
import { rerankChunks } from "./reranker";

interface RAGInput {
  readonly db: Database;
  readonly bigrag: BigRAGClient;
  readonly env: Env;
  readonly virtualKeyId: string;
  readonly messages: unknown[];
  readonly headers: Readonly<Record<string, string>>;
}

interface RAGResult {
  readonly injectedMessages: unknown[];
  readonly used: boolean;
  readonly chunksInjected: number;
  readonly responseHeaders: Record<string, string>;
}

type CollectionRow = typeof knowledgeCollections.$inferSelect;

const NOOP: RAGResult = {
  chunksInjected: 0,
  injectedMessages: [],
  responseHeaders: {},
  used: false
};

const noop = (messages: unknown[]): RAGResult => ({
  ...NOOP,
  injectedMessages: messages
});

const extractQueryText = (messages: unknown[]): string | null => {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i] as Record<string, unknown> | undefined;
    if (!msg || msg.role !== "user") continue;

    if (typeof msg.content === "string") return msg.content;

    if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        const p = part as Record<string, unknown>;
        if (p.type === "text" && typeof p.text === "string") return p.text;
      }
    }
  }

  return null;
};

const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

const resolveCollections = async (
  db: Database,
  headers: Readonly<Record<string, string>>,
  virtualKeyId: string
): Promise<CollectionRow[]> => {
  const collectionHeader = headers["x-knowledge-collection"];

  if (collectionHeader) {
    const names = collectionHeader.split(",").map((n) => n.trim());
    const found = await db
      .select()
      .from(knowledgeCollections)
      .where(
        and(
          inArray(knowledgeCollections.name, names),
          eq(knowledgeCollections.isEnabled, true)
        )
      );
    return found;
  }

  const bindings = await db
    .select()
    .from(knowledgeKeyBindings)
    .where(
      and(
        eq(knowledgeKeyBindings.virtualKeyId, virtualKeyId),
        eq(knowledgeKeyBindings.ragEnabled, true)
      )
    );

  if (bindings.length > 0) {
    const collectionIds = bindings.map((b) => b.collectionId);
    const found = await db
      .select()
      .from(knowledgeCollections)
      .where(
        and(
          inArray(knowledgeCollections.id, collectionIds),
          eq(knowledgeCollections.isEnabled, true)
        )
      );
    return found;
  }

  const defaults = await db
    .select()
    .from(knowledgeCollections)
    .where(
      and(
        eq(knowledgeCollections.isDefault, true),
        eq(knowledgeCollections.isEnabled, true)
      )
    );

  return defaults;
};

export const performRAGInjection = async (
  input: RAGInput
): Promise<RAGResult> => {
  const startTime = Date.now();

  const enabledHeader = input.headers["x-knowledge-enabled"];
  if (enabledHeader === "false") return noop(input.messages);

  const collections = await resolveCollections(
    input.db,
    input.headers,
    input.virtualKeyId
  );

  if (collections.length === 0) return noop(input.messages);

  const queryText = extractQueryText(input.messages);
  if (!queryText) return noop(input.messages);

  const allChunks: {
    collectionId: string;
    content: string;
    documentId: string;
    id: string;
    score: number;
  }[] = [];

  for (const collection of collections) {
    const result = await input.bigrag.query(collection.name, {
      min_score: collection.similarityThreshold,
      query: queryText,
      top_k: collection.topK
    });

    // Map bigRAG document IDs to Raven document IDs
    const ravenDocs = await input.db
      .select({
        bigragDocumentId: knowledgeDocuments.bigragDocumentId,
        id: knowledgeDocuments.id
      })
      .from(knowledgeDocuments)
      .where(eq(knowledgeDocuments.collectionId, collection.id));

    const bigragToRaven = new Map(
      ravenDocs
        .filter((d) => d.bigragDocumentId)
        .map((d) => [d.bigragDocumentId!, d.id])
    );

    for (const r of result.results) {
      allChunks.push({
        collectionId: collection.id,
        content: r.text,
        documentId: bigragToRaven.get(r.document_id) ?? r.document_id,
        id: r.id,
        score: r.score
      });
    }

    if (result.results.length > 0 && collection.rerankingEnabled) {
      const apiKey = await getOpenAIKeyForReranking(input.db, input.env);
      if (apiKey) {
        const toRerank = allChunks
          .filter((c) => c.collectionId === collection.id)
          .map((c) => ({
            content: c.content,
            id: c.id,
            originalScore: c.score
          }));

        const reranked = await rerankChunks(apiKey, queryText, toRerank);

        const rerankedIds = reranked.map((r) => r.id);
        const otherChunks = allChunks.filter(
          (c) => c.collectionId !== collection.id
        );
        const reorderedChunks = rerankedIds
          .map((id) => allChunks.find((c) => c.id === id)!)
          .filter(Boolean);

        allChunks.length = 0;
        allChunks.push(...otherChunks, ...reorderedChunks);
      }
    }
  }

  if (allChunks.length === 0) return noop(input.messages);

  const documentIds = [...new Set(allChunks.map((c) => c.documentId))];
  const documents =
    documentIds.length > 0
      ? await input.db
          .select({
            id: knowledgeDocuments.id,
            title: knowledgeDocuments.title
          })
          .from(knowledgeDocuments)
          .where(inArray(knowledgeDocuments.id, documentIds))
      : [];

  const documentMap = new Map(documents.map((d) => [d.id, d.title]));

  const maxTokens = collections[0]!.maxContextTokens;
  let totalTokens = 0;
  const contextParts: string[] = [];
  let injectedCount = 0;

  for (const chunk of allChunks) {
    const docTitle = documentMap.get(chunk.documentId) ?? "Unknown";
    const part = `---\n[Source: ${docTitle}]\n${chunk.content}\n---`;
    const partTokens = estimateTokens(part);

    if (totalTokens + partTokens > maxTokens) break;

    contextParts.push(part);
    totalTokens += partTokens;
    injectedCount++;
  }

  if (contextParts.length === 0) return noop(input.messages);

  const contextMessage = {
    content: `Use the following context to inform your response. If the context is not relevant, ignore it.\n\n${contextParts.join("\n")}`,
    role: "system"
  };

  const injectedMessages = [contextMessage, ...input.messages];

  const latencyMs = Date.now() - startTime;
  const topScore =
    allChunks.length > 0 ? Math.max(...allChunks.map((c) => c.score)) : 0;

  const collectionId = collections[0]!.id;
  await input.db
    .insert(knowledgeQueryLogs)
    .values({
      chunkIds: allChunks.slice(0, injectedCount).map((c) => ({
        id: c.id,
        score: c.score
      })),
      chunksInjected: injectedCount,
      chunksRetrieved: allChunks.length,
      collectionId,
      latencyMs,
      queryText,
      topSimilarityScore: topScore,
      totalContextTokens: totalTokens
    })
    .catch((err) => {
      log.error("Failed to insert knowledge query log", err);
    });

  log.info("RAG injection complete", {
    chunksInjected: injectedCount,
    chunksRetrieved: allChunks.length,
    collectionCount: collections.length,
    latencyMs,
    topScore
  });

  return {
    chunksInjected: injectedCount,
    injectedMessages,
    responseHeaders: {
      "X-Knowledge-Chunks": String(injectedCount),
      "X-Knowledge-Used": "true"
    },
    used: true
  };
};

// Helper: get OpenAI key only for reranking (optional)
import { providerConfigs } from "@raven/db";
import { decrypt } from "@/lib/crypto";

const getOpenAIKeyForReranking = async (
  db: Database,
  env: Env
): Promise<string | null> => {
  try {
    const [config] = await db
      .select()
      .from(providerConfigs)
      .where(eq(providerConfigs.provider, "openai"))
      .limit(1);
    if (!config) return null;
    return decrypt(config.apiKey, env.ENCRYPTION_SECRET);
  } catch {
    return null;
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/modules/knowledge/rag/injection.ts
git commit -m "feat: rewrite RAG injection to use bigRAG query API"
```

---

## Task 12: Update Proxy Pipeline & OpenAI-Compat Module

**Files:**
- Modify: `apps/api/src/modules/proxy/pipeline.ts`
- Modify: `apps/api/src/modules/openai-compat/index.ts`
- Modify: `apps/api/src/modules/openai-compat/handler.ts`

Replace all Qdrant references with bigRAG client.

- [ ] **Step 1: Update pipeline.ts**

In `apps/api/src/modules/proxy/pipeline.ts`:

1. Replace the import:
   - Remove: `import type { QdrantClient } from "@qdrant/js-client-rest";`
   - Add: `import type { BigRAGClient } from "@/lib/bigrag";`

2. In the `PipelineInput` interface, replace:
   - `readonly qdrant?: QdrantClient;` → `readonly bigrag?: BigRAGClient;`

3. In the RAG injection block (~line 103), replace:
   - `if (input.knowledgeEnabled && input.qdrant && hasMessages)` → `if (input.knowledgeEnabled && input.bigrag && hasMessages)`
   - Replace `qdrant: input.qdrant,` → `bigrag: input.bigrag,`
   - Remove `redis: input.redis,` line from `performRAGInjection` call (no longer needed for embedding cache)

Wait — actually `redis` is no longer needed in the injection since we don't cache embeddings anymore (bigRAG handles embedding internally). However, looking at the injection rewrite in Task 11, we removed the Redis dependency. Let me verify the interface: yes, the new `RAGInput` in Task 11 no longer has `redis`. Update the pipeline call accordingly.

- [ ] **Step 2: Update openai-compat/index.ts**

```typescript
// apps/api/src/modules/openai-compat/index.ts
import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import { Hono } from "hono";
import type { Redis } from "ioredis";
import type { BigRAGClient } from "@/lib/bigrag";
import { chatCompletionsHandler } from "./handler";

export const createOpenAICompatModule = (
  db: Database,
  redis: Redis,
  env: Env,
  bigrag: BigRAGClient,
  knowledgeEnabled: boolean
) => {
  const app = new Hono();
  app.post(
    "/chat/completions",
    chatCompletionsHandler(db, redis, env, bigrag, knowledgeEnabled)
  );
  return app;
};
```

- [ ] **Step 3: Update openai-compat/handler.ts**

Replace `QdrantClient` references with `BigRAGClient`:

```typescript
// apps/api/src/modules/openai-compat/handler.ts
import type { Env } from "@raven/config";
import { MODEL_CATALOG } from "@raven/data";
import type { Database } from "@raven/db";
import type { Context } from "hono";
import type { Redis } from "ioredis";
import type { BigRAGClient } from "@/lib/bigrag";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { runPipeline } from "../proxy/pipeline";

export const chatCompletionsHandler = (
  db: Database,
  redis: Redis,
  env: Env,
  bigrag: BigRAGClient,
  knowledgeEnabled: boolean
) => {
  return async (c: Context): Promise<Response> => {
    const bodyText = await c.req.text();

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(bodyText);
    } catch {
      throw new ValidationError("Invalid JSON body");
    }

    const modelSlug = body.model as string;
    if (!modelSlug) throw new ValidationError("'model' field is required");

    const model = MODEL_CATALOG[modelSlug];
    if (!model) {
      throw new NotFoundError(
        `Model '${modelSlug}' is not supported. Use /v1/models to see available models.`
      );
    }

    const providerName = model.provider;

    return runPipeline({
      authHeader: c.req.header("Authorization") ?? "",
      bigrag,
      bodyText,
      db,
      env,
      extraResponseHeaders: {
        "X-Raven-Model": modelSlug,
        "X-Raven-Provider": providerName
      },
      incomingHeaders: c.req.header(),
      knowledgeEnabled,
      method: "POST",
      path: c.req.path,
      providerPath: `/v1/proxy/${providerName}/chat/completions`,
      redis,
      sessionId: c.req.header("x-session-id") ?? null,
      skipRouting: true,
      strictBody: true,
      upstreamPathOverride: "/v1/chat/completions",
      userAgent: c.req.header("user-agent") ?? null,
      userIdHeader: c.req.header("x-user-id")
    });
  };
};
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/proxy/pipeline.ts apps/api/src/modules/openai-compat/
git commit -m "feat: replace Qdrant with bigRAG in pipeline and OpenAI-compat"
```

---

## Task 13: Update Knowledge Module Root & Main App Entry

**Files:**
- Modify: `apps/api/src/modules/knowledge/index.ts`
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: Update `knowledge/index.ts`**

```typescript
// apps/api/src/modules/knowledge/index.ts
import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import { Hono } from "hono";
import type { Redis } from "ioredis";
import type { BigRAGClient } from "@/lib/bigrag";
import { createCollectionsModule } from "./collections/index";
import {
  createDocumentDetailModule,
  createDocumentsModule
} from "./documents/index";
import { createSearchModule } from "./search/index";

export const createKnowledgeModule = (
  db: Database,
  redis: Redis,
  bigrag: BigRAGClient,
  env: Env
) => {
  const app = new Hono();
  app.route("/collections", createCollectionsModule(db, bigrag));
  app.route(
    "/collections/:id/documents",
    createDocumentsModule(db, redis, bigrag)
  );
  app.route("/documents", createDocumentDetailModule(db, redis, bigrag));
  app.route("/search", createSearchModule(db, bigrag));
  return app;
};

export { createKeyBindingsModule } from "./key-bindings/index";
```

- [ ] **Step 2: Update `apps/api/src/index.ts`**

1. Replace imports:
   - Remove: `import { getQdrant } from "./lib/qdrant";`
   - Add: `import { getBigRAG } from "./lib/bigrag";`

2. Replace client initialization (line 52):
   - Remove: `const qdrant = getQdrant(env.QDRANT_URL, env.QDRANT_API_KEY);`
   - Add: `const bigrag = getBigRAG(env.BIGRAG_URL, env.BIGRAG_API_KEY);`

3. Update `createOpenAICompatModule` call (~line 159):
   - Replace `qdrant` with `bigrag`

4. Update `runPipeline` call in `/v1/proxy/*` handler (~line 183):
   - Replace `qdrant,` with `bigrag,`

5. Update `createKnowledgeModule` call (~line 228):
   - Replace `qdrant` with `bigrag`

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/knowledge/index.ts apps/api/src/index.ts
git commit -m "feat: wire main app entry to bigRAG client"
```

---

## Task 14: Rewrite Cron Worker

**Files:**
- Modify: `apps/cron/src/index.ts`
- Modify: `apps/cron/src/knowledge/worker.ts`

The cron worker now only handles URL crawl jobs. File/image uploads go directly through bigRAG. The worker crawls URLs, saves content as markdown, and uploads to bigRAG.

- [ ] **Step 1: Rewrite `apps/cron/src/knowledge/worker.ts`**

```typescript
// apps/cron/src/knowledge/worker.ts
import { unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createId } from "@paralleldrive/cuid2";
import type { Database } from "@raven/db";
import { knowledgeCollections, knowledgeDocuments } from "@raven/db";
import { eq } from "drizzle-orm";
import type { Redis } from "ioredis";
import type { BigRAGClient } from "@/lib/bigrag";
import { log } from "./logger";
import { crawlUrl } from "./parsers/url";
import type { IngestionJob } from "./queue";
import {
  completeJob,
  dequeueJob,
  promoteDelayedJobs,
  recoverStuckJobs,
  retryJob
} from "./queue";

interface WorkerDeps {
  readonly db: Database;
  readonly redis: Redis;
  readonly bigrag: BigRAGClient;
}

const cleanupFile = async (filePath?: string): Promise<void> => {
  if (!filePath) return;
  try {
    await unlink(filePath);
  } catch {
    // File may have already been removed
  }
};

const processJob = async (
  job: IngestionJob,
  deps: WorkerDeps
): Promise<void> => {
  const { db, bigrag } = deps;

  log.info("Processing ingestion job", {
    attempt: job.attempt,
    documentId: job.documentId,
    type: job.type
  });

  // Mark document as processing
  await db
    .update(knowledgeDocuments)
    .set({
      chunkCount: 0,
      status: "processing",
      tokenCount: 0,
      updatedAt: new Date()
    })
    .where(eq(knowledgeDocuments.id, job.documentId));

  // Load collection config
  const [collection] = await db
    .select()
    .from(knowledgeCollections)
    .where(eq(knowledgeCollections.id, job.collectionId))
    .limit(1);

  if (!collection) {
    log.info("Collection no longer exists, skipping job", {
      collectionId: job.collectionId
    });
    return;
  }

  // Load document for metadata
  const [document] = await db
    .select()
    .from(knowledgeDocuments)
    .where(eq(knowledgeDocuments.id, job.documentId))
    .limit(1);

  if (!document) {
    log.info("Document no longer exists, skipping job", {
      documentId: job.documentId
    });
    return;
  }

  // URL jobs: crawl and upload to bigRAG as markdown
  if (job.type !== "url" || !job.sourceUrl) {
    throw new Error(`Unexpected job type in worker: ${job.type}`);
  }

  const crawlLimit =
    typeof document.metadata?.crawlLimit === "number"
      ? document.metadata.crawlLimit
      : undefined;

  const parts: string[] = [];
  let pageIndex = 0;

  for await (const page of crawlUrl(job.sourceUrl, crawlLimit)) {
    parts.push(`## ${page.url}\n\n${page.text}`);
    pageIndex++;

    // Update progress
    await db
      .update(knowledgeDocuments)
      .set({ updatedAt: new Date() })
      .where(eq(knowledgeDocuments.id, job.documentId));

    log.info("Crawled page", {
      documentId: job.documentId,
      page: pageIndex,
      url: page.url
    });
  }

  if (parts.length === 0) {
    throw new Error("Crawl produced no content");
  }

  // Write concatenated content to temp markdown file
  const markdown = parts.join("\n\n---\n\n");
  const tempPath = join(tmpdir(), `raven-crawl-${createId()}.md`);
  await writeFile(tempPath, markdown, "utf-8");

  try {
    // Upload to bigRAG
    const bigragDoc = await bigrag.uploadDocumentFromPath(
      collection.name,
      tempPath,
      { source_url: job.sourceUrl }
    );

    // Store bigRAG document ID reference
    await db
      .update(knowledgeDocuments)
      .set({
        bigragDocumentId: bigragDoc.id,
        errorMessage: null,
        lastCrawledAt: new Date(),
        status: "processing",
        updatedAt: new Date()
      })
      .where(eq(knowledgeDocuments.id, job.documentId));

    log.info("Uploaded crawled content to bigRAG", {
      bigragDocumentId: bigragDoc.id,
      documentId: job.documentId,
      pages: pageIndex
    });
  } finally {
    await cleanupFile(tempPath);
  }
};

export const startWorker = (deps: WorkerDeps): (() => void) => {
  let running = true;

  const loop = async (): Promise<void> => {
    try {
      await recoverStuckJobs(deps.redis);
    } catch (err) {
      log.error("Failed to recover stuck jobs", err);
    }

    while (running) {
      try {
        await promoteDelayedJobs(deps.redis);
      } catch (err) {
        log.error("Failed to promote delayed jobs", err);
      }

      let job: IngestionJob | null = null;

      try {
        job = await dequeueJob(deps.redis, 5);
      } catch (err) {
        log.error("Failed to dequeue job", err);
        continue;
      }

      if (!job) {
        continue;
      }

      try {
        await processJob(job, deps);
        await completeJob(deps.redis, job);
      } catch (err) {
        log.error("Ingestion job failed", err, {
          attempt: job.attempt,
          documentId: job.documentId,
          type: job.type
        });

        const willRetry = await retryJob(deps.redis, job);

        if (!willRetry) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          try {
            await deps.db
              .update(knowledgeDocuments)
              .set({
                errorMessage,
                status: "failed",
                updatedAt: new Date()
              })
              .where(eq(knowledgeDocuments.id, job.documentId));
          } catch (dbErr) {
            log.error("Failed to mark document as failed", dbErr, {
              documentId: job.documentId
            });
          }
        }
      }
    }
  };

  loop().catch((err) => {
    log.error("Worker loop crashed unexpectedly", err);
  });

  return () => {
    running = false;
  };
};
```

Note: The `BigRAGClient` import uses `@/lib/bigrag` — the cron app needs access to this. Since the bigrag client is defined in the API app, we should either:
- Move `bigrag.ts` to a shared package, OR
- Create a local copy in the cron app, OR
- Instantiate `BigRAGClient` directly in cron's `index.ts`

The simplest approach: create `apps/cron/src/lib/bigrag.ts` by copying the class. However, to avoid duplication, let's just import the class inline. Since both apps build independently with esbuild, the cleanest solution is to duplicate the `BigRAGClient` class into the cron app.

Create `apps/cron/src/lib/bigrag.ts` with the same `BigRAGClient` class from Task 1 (just the class and constructor, without the singleton/types).

- [ ] **Step 2: Create `apps/cron/src/lib/bigrag.ts`**

Copy the `BigRAGClient` class from `apps/api/src/lib/bigrag.ts`. Only include the class itself and the methods used by the worker: `uploadDocumentFromPath`.

```typescript
// apps/cron/src/lib/bigrag.ts
export class BigRAGClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`
    };
    if (body && !(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }
    const response = await fetch(`${this.baseUrl}${path}`, {
      body:
        body instanceof FormData
          ? body
          : body
            ? JSON.stringify(body)
            : undefined,
      headers:
        body instanceof FormData
          ? { Authorization: `Bearer ${this.apiKey}` }
          : headers,
      method
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`bigRAG API error ${response.status}: ${text}`);
    }
    return response.json() as Promise<T>;
  }

  async uploadDocumentFromPath(
    collectionName: string,
    filePath: string,
    metadata?: Record<string, unknown>
  ): Promise<{ id: string; status: string }> {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const buffer = fs.readFileSync(filePath);
    const filename = path.basename(filePath);
    const blob = new Blob([buffer]);
    const form = new FormData();
    form.append("file", blob, filename);
    if (metadata) {
      form.append("metadata", JSON.stringify(metadata));
    }
    return this.request(
      "POST",
      `/v1/collections/${encodeURIComponent(collectionName)}/documents`,
      form
    );
  }

  async getDocument(
    collectionName: string,
    documentId: string
  ): Promise<{ id: string; status: string; chunk_count: number; error_message: string | null }> {
    return this.request(
      "GET",
      `/v1/collections/${encodeURIComponent(collectionName)}/documents/${documentId}`
    );
  }
}
```

- [ ] **Step 3: Rewrite `apps/cron/src/index.ts`**

```typescript
// apps/cron/src/index.ts
import { parseEnv } from "@raven/config";
import { createDatabase } from "@raven/db";
import Redis from "ioredis";
import { cleanupExpiredInvitations } from "./jobs/invitations";
import { deactivateExpiredKeys } from "./jobs/keys";
import { recrawlDueDocuments } from "./jobs/recrawl";
import { cleanupRetention } from "./jobs/retention";
import { cleanupExpiredSessions } from "./jobs/sessions";
import { syncDocumentStatuses } from "./jobs/sync-statuses";
import { cleanupExpiredVerifications } from "./jobs/verifications";
import { startWorker } from "./knowledge/worker";
import { BigRAGClient } from "./lib/bigrag";

const env = parseEnv();
const db = createDatabase(env.DATABASE_URL);
const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 3
});

const bigrag = new BigRAGClient(env.BIGRAG_URL, env.BIGRAG_API_KEY);

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const runJob = async (name: string, fn: () => Promise<void>) => {
  try {
    console.log(`[${new Date().toISOString()}] Running ${name}...`);
    await fn();
    console.log(`[${new Date().toISOString()}] ${name} complete`);
  } catch (err) {
    console.error(`${name} failed:`, err);
  }
};

const runAllJobs = async () => {
  await runJob("retention cleanup", () => cleanupRetention(db));
  await runJob("session cleanup", () => cleanupExpiredSessions(db));
  await runJob("verification cleanup", () => cleanupExpiredVerifications(db));
  await runJob("invitation cleanup", () => cleanupExpiredInvitations(db));
  await runJob("key deactivation", () => deactivateExpiredKeys(db));
  await runJob("url recrawl", () => recrawlDueDocuments(db, redis));
  await runJob("document status sync", () =>
    syncDocumentStatuses(db, bigrag)
  );
};

const stopWorker = startWorker({ bigrag, db, redis });

console.log("Raven cron worker started");
runAllJobs();

// Every 15 minutes: url recrawl + document status sync
setInterval(
  () => runJob("url recrawl", () => recrawlDueDocuments(db, redis)),
  FIFTEEN_MINUTES
);
setInterval(
  () => runJob("document status sync", () => syncDocumentStatuses(db, bigrag)),
  FIFTEEN_MINUTES
);

// Hourly: expired key deactivation
setInterval(
  () => runJob("key deactivation", () => deactivateExpiredKeys(db)),
  HOUR
);

// Daily: cleanup jobs
setInterval(() => runJob("retention cleanup", () => cleanupRetention(db)), DAY);
setInterval(
  () => runJob("session cleanup", () => cleanupExpiredSessions(db)),
  DAY
);
setInterval(
  () => runJob("verification cleanup", () => cleanupExpiredVerifications(db)),
  DAY
);
setInterval(
  () => runJob("invitation cleanup", () => cleanupExpiredInvitations(db)),
  DAY
);

redis.on("error", (err) => {
  console.error("Redis connection error:", err);
});

process.on("SIGTERM", () => {
  console.log("Cron worker shutting down");
  stopWorker();
  redis.disconnect();
  process.exit(0);
});
```

- [ ] **Step 4: Create `apps/cron/src/jobs/sync-statuses.ts`**

This job polls bigRAG for documents that are still processing and syncs their status back to Raven.

```typescript
// apps/cron/src/jobs/sync-statuses.ts
import type { Database } from "@raven/db";
import {
  knowledgeCollections,
  knowledgeDocuments
} from "@raven/db";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import type { BigRAGClient } from "../lib/bigrag";

export const syncDocumentStatuses = async (
  db: Database,
  bigrag: BigRAGClient
): Promise<void> => {
  // Find all documents still processing that have a bigRAG document ID
  const pending = await db
    .select({
      bigragDocumentId: knowledgeDocuments.bigragDocumentId,
      collectionId: knowledgeDocuments.collectionId,
      id: knowledgeDocuments.id
    })
    .from(knowledgeDocuments)
    .where(
      and(
        inArray(knowledgeDocuments.status, ["pending", "processing"]),
        isNotNull(knowledgeDocuments.bigragDocumentId)
      )
    );

  if (pending.length === 0) return;

  // Build collection name lookup
  const collectionIds = [...new Set(pending.map((d) => d.collectionId))];
  const collections = await db
    .select({ id: knowledgeCollections.id, name: knowledgeCollections.name })
    .from(knowledgeCollections)
    .where(inArray(knowledgeCollections.id, collectionIds));

  const collectionMap = new Map(collections.map((c) => [c.id, c.name]));

  let synced = 0;
  for (const doc of pending) {
    const collectionName = collectionMap.get(doc.collectionId);
    if (!collectionName || !doc.bigragDocumentId) continue;

    try {
      const bigragDoc = await bigrag.getDocument(
        collectionName,
        doc.bigragDocumentId
      );

      if (bigragDoc.status === "ready") {
        await db
          .update(knowledgeDocuments)
          .set({
            chunkCount: bigragDoc.chunk_count,
            errorMessage: null,
            status: "ready",
            updatedAt: new Date()
          })
          .where(eq(knowledgeDocuments.id, doc.id));
        synced++;
      } else if (bigragDoc.status === "failed") {
        await db
          .update(knowledgeDocuments)
          .set({
            errorMessage: bigragDoc.error_message,
            status: "failed",
            updatedAt: new Date()
          })
          .where(eq(knowledgeDocuments.id, doc.id));
        synced++;
      }
    } catch {
      // Skip — will retry on next cycle
    }
  }

  if (synced > 0) {
    console.log(`Document status sync: updated ${synced} document(s)`);
  }
};
```

- [ ] **Step 5: Commit**

```bash
git add apps/cron/
git commit -m "feat: rewrite cron worker for bigRAG integration"
```

---

## Task 15: Delete Obsolete Files

**Files to delete:**
- `apps/api/src/lib/qdrant.ts`
- `apps/api/src/modules/knowledge/rag/qdrant.ts`
- `apps/api/src/modules/knowledge/ingestion/embedder.ts`
- `apps/cron/src/knowledge/chunker.ts`
- `apps/cron/src/knowledge/embedder.ts`
- `apps/cron/src/knowledge/qdrant.ts`
- `apps/cron/src/knowledge/parsers/pdf.ts`
- `apps/cron/src/knowledge/parsers/docx.ts`
- `apps/cron/src/knowledge/parsers/image.ts`
- `apps/cron/src/knowledge/parsers/markdown.ts`

- [ ] **Step 1: Delete the files**

```bash
rm apps/api/src/lib/qdrant.ts
rm apps/api/src/modules/knowledge/rag/qdrant.ts
rm apps/api/src/modules/knowledge/ingestion/embedder.ts
rm apps/cron/src/knowledge/chunker.ts
rm apps/cron/src/knowledge/embedder.ts
rm apps/cron/src/knowledge/qdrant.ts
rm apps/cron/src/knowledge/parsers/pdf.ts
rm apps/cron/src/knowledge/parsers/docx.ts
rm apps/cron/src/knowledge/parsers/image.ts
rm apps/cron/src/knowledge/parsers/markdown.ts
```

- [ ] **Step 2: Commit**

```bash
git add -u
git commit -m "refactor: remove Qdrant client and custom parsers/chunker/embedder"
```

---

## Task 16: Update Dependencies

**Files:**
- Modify: `apps/api/package.json`
- Modify: `apps/cron/package.json`

- [ ] **Step 1: Remove Qdrant and unused deps from API**

In `apps/api/package.json`, remove from `dependencies`:
- `"@qdrant/js-client-rest": "^1.17.0"`
- `"openai": "^6.33.0"` — **Keep this** if the reranker still uses OpenAI. Check: yes, `reranker.ts` imports `OpenAI`. Keep `openai` in API deps.

So only remove:
- `"@qdrant/js-client-rest": "^1.17.0"`

- [ ] **Step 2: Remove Qdrant and parser deps from cron**

In `apps/cron/package.json`, remove from `dependencies`:
- `"@qdrant/js-client-rest": "^1.17.0"`
- `"openai": "^6.33.0"`
- `"pdf-parse": "^2.4.5"`
- `"mammoth": "^1.12.0"`

Remove from `devDependencies`:
- `"@types/pdf-parse": "^1.1.5"`

- [ ] **Step 3: Run pnpm install to update lockfile**

```bash
cd /Users/yoginth/raven && pnpm install
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/package.json apps/cron/package.json pnpm-lock.yaml
git commit -m "refactor: remove Qdrant, pdf-parse, mammoth dependencies"
```

---

## Task 17: Fix Remaining Imports and Typecheck

After all the changes, run typecheck to catch any remaining broken imports or type errors.

- [ ] **Step 1: Check for remaining Qdrant/knowledgeChunks imports**

```bash
cd /Users/yoginth/raven && grep -r "qdrant\|QdrantClient\|knowledgeChunks\|@qdrant" apps/ packages/ --include="*.ts" -l
```

Fix any remaining references found.

- [ ] **Step 2: Check for remaining embedder imports**

```bash
cd /Users/yoginth/raven && grep -r "hasOpenAIProvider\|embedQuery\|embedTexts\|ingestion/embedder" apps/ --include="*.ts" -l
```

Fix any remaining references. The `ingestion/queue.ts` in the API app is still needed (for URL enqueue). The `ingestion/embedder.ts` is deleted — ensure no remaining imports.

- [ ] **Step 3: Run typecheck**

```bash
cd /Users/yoginth/raven && pnpm typecheck
```

Fix any type errors that arise.

- [ ] **Step 4: Run lint**

```bash
cd /Users/yoginth/raven && pnpm lint
```

Fix any lint errors (unused imports, etc.).

- [ ] **Step 5: Commit fixes**

```bash
git add -A
git commit -m "fix: resolve typecheck and lint errors from bigRAG migration"
```

---

## Task 18: Update Collection Schema Validation

**Files:**
- Modify: `apps/api/src/modules/knowledge/collections/schema.ts`

The `chunkStrategy` field should be removed from the collection schema since bigRAG handles chunking strategy internally.

- [ ] **Step 1: Remove `chunkStrategy` from schema validation**

In `collections/schema.ts`, remove the `chunkStrategy` field from both `createCollectionSchema` and `updateCollectionSchema`.

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/modules/knowledge/collections/schema.ts
git commit -m "refactor: remove chunkStrategy from collection schema"
```

---

## Summary of Architecture After Migration

```
Raven API                              bigRAG API
├── Collections CRUD ──sync──────────→ Collections
├── File/Image upload ──proxy────────→ Document upload (Docling parsing)
├── URL crawl (cron worker) ─────────→ Upload markdown to bigRAG
├── Search ──────────────────────────→ Query (semantic search via Milvus)
├── RAG injection ───────────────────→ Query per collection
│   └── Reranking (GPT-4o-mini) ←─── (stays in Raven)
├── Status sync (cron job) ──poll───→ Document status
├── Chunks viewer ───────────────────→ Get document chunks
├── Key bindings (local)
├── Query logging (local)
└── Analytics (local)
```

**What Raven no longer does:**
- Document parsing (PDF, DOCX, images) — bigRAG + Docling
- Text chunking — bigRAG
- Embedding generation — bigRAG
- Vector storage/search — bigRAG + Milvus

**What Raven still does:**
- User auth, key management, RBAC
- Collection resolution (key bindings, defaults, headers)
- Reranking (GPT-4o-mini, optional)
- Context building with token limits
- Query logging and analytics
- URL crawling with periodic recrawl
- RAG injection into LLM requests
