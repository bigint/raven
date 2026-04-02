import { readFile } from "node:fs/promises";
import { basename } from "node:path";

export interface BigRAGCollection {
  chunk_overlap: number;
  chunk_size: number;
  created_at: string;
  description: string | null;
  dimension: number;
  document_count: number;
  embedding_model: string;
  embedding_provider: string;
  id: string;
  metadata: Record<string, unknown> | null;
  name: string;
  updated_at: string;
}

export interface BigRAGChunk {
  chunk_index: number;
  id: string;
  metadata: Record<string, unknown> | null;
  text: string;
}

export interface BigRAGDocument {
  chunk_count: number;
  collection_id: string;
  created_at: string;
  error_message: string | null;
  file_size: number;
  file_type: string;
  filename: string;
  id: string;
  metadata: Record<string, unknown> | null;
  status: "failed" | "pending" | "processing" | "ready";
  updated_at: string;
}

export interface BigRAGQueryResult {
  chunk_index: number;
  document_id: string;
  id: string;
  metadata: Record<string, unknown> | null;
  score: number;
  text: string;
}

export interface BigRAGQueryResponse {
  collection: string;
  query: string;
  results: BigRAGQueryResult[];
  total: number;
}

export interface CreateCollectionInput {
  chunk_overlap?: number;
  chunk_size?: number;
  description?: string;
  dimension?: number;
  embedding_model?: string;
  embedding_provider?: string;
  metadata?: Record<string, unknown>;
  name: string;
}

export interface QueryInput {
  filters?: Record<string, unknown>;
  min_score?: number;
  query: string;
  top_k?: number;
}

export class BigRAGClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(baseUrl: string, apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  async createCollection(
    input: CreateCollectionInput
  ): Promise<BigRAGCollection> {
    return this.request<BigRAGCollection>("POST", "/v1/collections", input);
  }

  async deleteCollection(name: string): Promise<void> {
    await this.request<void>(
      "DELETE",
      `/v1/collections/${encodeURIComponent(name)}`
    );
  }

  async deleteDocument(
    collectionName: string,
    documentId: string
  ): Promise<void> {
    await this.request<void>(
      "DELETE",
      `/v1/collections/${encodeURIComponent(collectionName)}/documents/${documentId}`
    );
  }

  async getDocument(
    collectionName: string,
    documentId: string
  ): Promise<BigRAGDocument> {
    return this.request<BigRAGDocument>(
      "GET",
      `/v1/collections/${encodeURIComponent(collectionName)}/documents/${documentId}`
    );
  }

  async getDocumentChunks(
    collectionName: string,
    documentId: string
  ): Promise<BigRAGChunk[]> {
    return this.request<BigRAGChunk[]>(
      "GET",
      `/v1/collections/${encodeURIComponent(collectionName)}/documents/${documentId}/chunks`
    );
  }

  async health(): Promise<{ status: string }> {
    return this.request<{ status: string }>("GET", "/health");
  }

  async query(
    collectionName: string,
    input: QueryInput
  ): Promise<BigRAGQueryResponse> {
    return this.request<BigRAGQueryResponse>(
      "POST",
      `/v1/collections/${encodeURIComponent(collectionName)}/query`,
      input
    );
  }

  async reprocessDocument(
    collectionName: string,
    documentId: string
  ): Promise<BigRAGDocument> {
    return this.request<BigRAGDocument>(
      "POST",
      `/v1/collections/${encodeURIComponent(collectionName)}/documents/${documentId}/reprocess`
    );
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

    const response = await fetch(
      `${this.baseUrl}/v1/collections/${encodeURIComponent(collectionName)}/documents`,
      {
        body: form,
        headers: { Authorization: `Bearer ${this.apiKey}` },
        method: "POST"
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`bigRAG ${response.status}: ${text}`);
    }

    return response.json() as Promise<BigRAGDocument>;
  }

  async uploadDocumentFromPath(
    collectionName: string,
    filePath: string,
    metadata?: Record<string, unknown>
  ): Promise<BigRAGDocument> {
    const buffer = await readFile(filePath);
    const filename = basename(filePath);
    const blob = new Blob([buffer]);
    return this.uploadDocument(collectionName, blob, filename, metadata);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        ...(body ? { "Content-Type": "application/json" } : {})
      },
      method
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`bigRAG ${response.status}: ${text}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }
}

let client: BigRAGClient | null = null;

export const getBigRAG = (baseUrl: string, apiKey: string): BigRAGClient => {
  if (!client) {
    client = new BigRAGClient(baseUrl, apiKey);
  }
  return client;
};
