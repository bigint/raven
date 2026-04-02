import { readFile } from "node:fs/promises";
import { basename } from "node:path";

interface BigRAGDocument {
  chunk_count: number;
  error_message: string | null;
  id: string;
  status: "failed" | "pending" | "processing" | "ready";
}

export class BigRAGClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(baseUrl: string, apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/+$/, "");
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

  async uploadDocumentFromPath(
    collectionName: string,
    filePath: string,
    metadata?: Record<string, unknown>
  ): Promise<BigRAGDocument> {
    const buffer = await readFile(filePath);
    const filename = basename(filePath);
    const blob = new Blob([buffer]);

    const form = new FormData();
    form.append("file", blob, filename);
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
