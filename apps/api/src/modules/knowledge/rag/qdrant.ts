import type { QdrantClient } from "@qdrant/js-client-rest";
import { log } from "@/lib/logger";

interface PointPayload {
  readonly collectionId: string;
  readonly documentId: string;
  readonly chunkIndex: number;
  readonly content: string;
  readonly metadata?: Record<string, unknown>;
}

interface SearchResult {
  readonly id: string;
  readonly score: number;
  readonly content: string;
  readonly documentId: string;
  readonly chunkIndex: number;
  readonly metadata?: Record<string, unknown>;
}

export const ensureCollection = async (
  client: QdrantClient,
  collectionName: string,
  dimensions: number
): Promise<void> => {
  const exists = await client.collectionExists(collectionName);
  if (exists.exists) return;
  await client.createCollection(collectionName, {
    vectors: { distance: "Cosine", size: dimensions }
  });
  log.info("Created Qdrant collection", { collectionName, dimensions });
};

export const deleteCollection = async (
  client: QdrantClient,
  collectionName: string
): Promise<void> => {
  const exists = await client.collectionExists(collectionName);
  if (!exists.exists) return;
  await client.deleteCollection(collectionName);
  log.info("Deleted Qdrant collection", { collectionName });
};

export const upsertVectors = async (
  client: QdrantClient,
  collectionName: string,
  points: {
    id: string;
    vector: number[];
    payload: PointPayload;
  }[]
): Promise<void> => {
  if (points.length === 0) return;
  const batchSize = 500;
  for (let i = 0; i < points.length; i += batchSize) {
    const batch = points.slice(i, i + batchSize);
    await client.upsert(collectionName, {
      points: batch.map((p) => ({
        id: p.id,
        payload: p.payload as unknown as Record<string, unknown>,
        vector: p.vector
      }))
    });
  }
  log.info("Upserted vectors", { collectionName, count: points.length });
};

export const deleteVectorsByDocumentId = async (
  client: QdrantClient,
  collectionName: string,
  documentId: string
): Promise<void> => {
  const exists = await client.collectionExists(collectionName);
  if (!exists.exists) return;
  await client.delete(collectionName, {
    filter: {
      must: [{ key: "documentId", match: { value: documentId } }]
    }
  });
};

export const searchVectors = async (
  client: QdrantClient,
  collectionName: string,
  queryVector: number[],
  topK: number,
  scoreThreshold: number
): Promise<SearchResult[]> => {
  const results = await client.search(collectionName, {
    limit: topK,
    score_threshold: scoreThreshold,
    vector: queryVector,
    with_payload: true
  });
  return results.map((r) => {
    const payload = r.payload as Record<string, unknown>;
    return {
      chunkIndex: payload.chunkIndex as number,
      content: payload.content as string,
      documentId: payload.documentId as string,
      id: r.id as string,
      metadata: payload.metadata as Record<string, unknown> | undefined,
      score: r.score
    };
  });
};
