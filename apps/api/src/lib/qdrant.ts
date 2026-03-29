import { QdrantClient } from "@qdrant/js-client-rest";

let client: QdrantClient | null = null;

export const getQdrant = (url: string, apiKey?: string): QdrantClient => {
  if (!client) {
    client = new QdrantClient({ apiKey, url });
  }
  return client;
};
