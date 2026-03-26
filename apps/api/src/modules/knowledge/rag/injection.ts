import type { QdrantClient } from "@qdrant/js-client-rest";
import type { Env } from "@raven/config";
import type { Database } from "@raven/db";
import {
  knowledgeCollections,
  knowledgeDocuments,
  knowledgeKeyBindings,
  knowledgeQueryLogs
} from "@raven/db";
import { and, eq, inArray } from "drizzle-orm";
import type { Redis } from "ioredis";
import { log } from "@/lib/logger";
import { embedQuery, getOpenAIKey } from "../ingestion/embedder";
import { searchVectors } from "./qdrant";
import { rerankChunks } from "./reranker";

interface RAGInput {
  readonly db: Database;
  readonly redis: Redis;
  readonly qdrant: QdrantClient;
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

const buildCacheKey = (model: string, query: string): string => {
  const prefix = Buffer.from(query.slice(0, 256)).toString("base64url");
  return `rag:embed:${model}:${prefix}`;
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

  const apiKey = await getOpenAIKey(input.db, input.env.ENCRYPTION_SECRET);

  const allChunks: {
    collectionId: string;
    content: string;
    documentId: string;
    id: string;
    score: number;
  }[] = [];

  for (const collection of collections) {
    const cacheKey = buildCacheKey(collection.embeddingModel, queryText);
    let queryVector: number[];

    const cached = await input.redis.get(cacheKey).catch(() => null);
    if (cached) {
      queryVector = JSON.parse(cached) as number[];
    } else {
      queryVector = await embedQuery(
        apiKey,
        queryText,
        collection.embeddingModel,
        collection.embeddingDimensions
      );
      await input.redis
        .set(cacheKey, JSON.stringify(queryVector), "EX", 300)
        .catch(() => undefined);
    }

    const results = await searchVectors(
      input.qdrant,
      collection.id,
      queryVector,
      collection.topK,
      collection.similarityThreshold
    );

    for (const r of results) {
      allChunks.push({
        collectionId: collection.id,
        content: r.content,
        documentId: r.documentId,
        id: r.id,
        score: r.score
      });
    }

    if (results.length > 0 && collection.rerankingEnabled) {
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
