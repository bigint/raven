import type { BigRAG } from "@bigrag/client";
import type { Database } from "@raven/db";
import {
  knowledgeCollections,
  knowledgeDocuments,
  knowledgeKeyBindings,
  knowledgeQueryLogs
} from "@raven/db";
import { and, eq, inArray } from "drizzle-orm";

import { log } from "@/lib/logger";
import {
  buildDocumentIdMap,
  resolveDocumentId
} from "../documents/map-ids";

interface RAGInput {
  readonly bigrag: BigRAG;
  readonly db: Database;
  readonly headers: Readonly<Record<string, string>>;
  readonly messages: unknown[];
  readonly virtualKeyId: string;
}

interface RAGResult {
  readonly chunksInjected: number;
  readonly injectedMessages: unknown[];
  readonly responseHeaders: Record<string, string>;
  readonly used: boolean;
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

interface ChunkEntry {
  collectionId: string;
  content: string;
  documentId: string;
  id: string;
  score: number;
}

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

  const searchMode = input.headers["x-knowledge-search-mode"] as
    | "hybrid"
    | "keyword"
    | "semantic"
    | undefined;

  // Query all collections in a single multiQuery call
  const collectionNames = collections.map((c) => c.name);
  const response = await input.bigrag.multiQuery({
    collections: collectionNames,
    min_score: collections[0]?.similarityThreshold ?? 0.3,
    query: queryText,
    search_mode: searchMode,
    top_k: collections[0]?.topK ?? 5
  });

  const collectionIds = collections.map((c) => c.id);
  const idMap = await buildDocumentIdMap(input.db, collectionIds);

  const allChunks: ChunkEntry[] = response.results.map((r) => ({
    collectionId: collections.find((c) => c.name === r.collection)?.id ?? "",
    content: r.text,
    documentId: resolveDocumentId(idMap, r.document_id),
    id: r.id,
    score: r.score
  }));

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

  const maxTokens = collections[0]?.maxContextTokens ?? 4096;
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

  const collectionId = collections[0]?.id ?? "";
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
      "X-Knowledge-Collections": collections.map((c) => c.name).join(","),
      "X-Knowledge-Used": "true"
    },
    used: true
  };
};
