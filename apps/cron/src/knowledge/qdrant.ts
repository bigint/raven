import { randomUUID } from "node:crypto";
import type { QdrantClient } from "@qdrant/js-client-rest";
import { log } from "./logger";

interface PointPayload {
  readonly collectionId: string;
  readonly documentId: string;
  readonly chunkIndex: number;
  readonly content: string;
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
        id: randomUUID(),
        payload: {
          ...(p.payload as unknown as Record<string, unknown>),
          chunkDbId: p.id
        },
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
