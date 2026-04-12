import { BigRAG } from "@bigrag/client";
import type { InstanceSettings } from "./instance-settings";

/** A BigRAG client memoized by (baseUrl, apiKey) so settings changes pick up
 * without restarting the server — but without paying a construction cost per
 * request when the settings haven't changed.
 */
let cached: { baseUrl: string; apiKey: string; client: BigRAG } | null = null;

export const resolveBigRAGClient = (
  settings: Pick<
    InstanceSettings,
    "bigrag_url" | "bigrag_api_key" | "knowledge_enabled"
  >
): BigRAG | null => {
  if (!settings.knowledge_enabled) return null;
  if (!settings.bigrag_url || !settings.bigrag_api_key) return null;

  if (
    cached &&
    cached.baseUrl === settings.bigrag_url &&
    cached.apiKey === settings.bigrag_api_key
  ) {
    return cached.client;
  }

  const client = new BigRAG({
    apiKey: settings.bigrag_api_key,
    baseUrl: settings.bigrag_url
  });
  cached = {
    apiKey: settings.bigrag_api_key,
    baseUrl: settings.bigrag_url,
    client
  };
  return client;
};

export const requireBigRAGClient = (
  settings: Pick<
    InstanceSettings,
    "bigrag_url" | "bigrag_api_key" | "knowledge_enabled"
  >
): BigRAG => {
  const client = resolveBigRAGClient(settings);
  if (!client) {
    throw new Error(
      "Knowledge / RAG is disabled. Enable it in Settings → Knowledge and provide a bigRAG URL and API key."
    );
  }
  return client;
};

export { BigRAG };
