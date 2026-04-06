import type { BigRAG } from "@bigrag/client";
import type { Database } from "@raven/db";
import { knowledgeKeyBindings, knowledgeQueryLogs } from "@raven/db";
import { and, eq } from "drizzle-orm";

import { log } from "@/lib/logger";

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

const DEFAULT_MAX_CONTEXT_TOKENS = 4096;

const resolveCollectionNames = async (
  db: Database,
  bigrag: BigRAG,
  headers: Readonly<Record<string, string>>,
  virtualKeyId: string
): Promise<string[]> => {
  const collectionHeader = headers["x-knowledge-collection"];

  if (collectionHeader) {
    return collectionHeader.split(",").map((n) => n.trim());
  }

  const bindings = await db
    .select({ collectionName: knowledgeKeyBindings.collectionName })
    .from(knowledgeKeyBindings)
    .where(
      and(
        eq(knowledgeKeyBindings.virtualKeyId, virtualKeyId),
        eq(knowledgeKeyBindings.ragEnabled, true)
      )
    );

  if (bindings.length > 0) {
    return bindings.map((b) => b.collectionName);
  }

  const explicitlyEnabled = headers["x-knowledge-enabled"] === "true";
  if (explicitlyEnabled) {
    const result = await bigrag.listCollections();
    return result.collections.map((c) => c.name);
  }

  return [];
};

export const performRAGInjection = async (
  input: RAGInput
): Promise<RAGResult> => {
  const startTime = Date.now();

  const enabledHeader = input.headers["x-knowledge-enabled"];
  if (enabledHeader === "false") return noop(input.messages);

  const collectionNames = await resolveCollectionNames(
    input.db,
    input.bigrag,
    input.headers,
    input.virtualKeyId
  );

  if (collectionNames.length === 0) return noop(input.messages);

  const queryText = extractQueryText(input.messages);
  if (!queryText) return noop(input.messages);

  const searchMode = input.headers["x-knowledge-search-mode"] as
    | "hybrid"
    | "keyword"
    | "semantic"
    | undefined;

  const response = await input.bigrag.multiQuery({
    collections: collectionNames,
    query: queryText,
    ...(searchMode ? { search_mode: searchMode } : {})
  });

  if (response.results.length === 0) return noop(input.messages);

  const maxTokens = DEFAULT_MAX_CONTEXT_TOKENS;
  let totalTokens = 0;
  const contextParts: string[] = [];
  let injectedCount = 0;

  for (const chunk of response.results) {
    const part = `---\n${chunk.text}\n---`;
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
    response.results.length > 0
      ? Math.max(...response.results.map((c) => c.score))
      : 0;

  const collectionName = collectionNames[0] ?? "";
  await input.db
    .insert(knowledgeQueryLogs)
    .values({
      chunkIds: response.results.slice(0, injectedCount).map((c) => ({
        id: c.id,
        score: c.score
      })),
      chunksInjected: injectedCount,
      chunksRetrieved: response.results.length,
      collectionName,
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
    chunksRetrieved: response.results.length,
    collectionCount: collectionNames.length,
    latencyMs,
    topScore
  });

  return {
    chunksInjected: injectedCount,
    injectedMessages,
    responseHeaders: {
      "X-Knowledge-Chunks": String(injectedCount),
      "X-Knowledge-Collections": collectionNames.join(","),
      "X-Knowledge-Used": "true"
    },
    used: true
  };
};
