import { createHash } from "node:crypto";
import type { Redis } from "ioredis";

interface SemanticCacheConfig {
  enabled: boolean;
  similarityThreshold: number;
  ttl: number;
  maxEntries: number;
}

const DEFAULT_CONFIG: SemanticCacheConfig = {
  enabled: true,
  maxEntries: 100000,
  similarityThreshold: 0.92,
  ttl: 86400
};

/**
 * Simple but effective: hash-based fingerprinting with normalized text.
 * For v1, we use text normalization + trigram hashing instead of embeddings.
 * This avoids the dependency on an embedding model while still catching
 * similar queries.
 */

const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const extractCacheKey = (
  messages: Array<{ role: string; content: unknown }>
): string => {
  const userMessages = messages
    .filter((m) => m.role === "user")
    .map((m) =>
      typeof m.content === "string" ? m.content : JSON.stringify(m.content)
    )
    .join("\n");
  return normalizeText(userMessages);
};

/** Generate n-gram fingerprint for similarity matching */
const generateFingerprint = (text: string, n: number = 3): Set<string> => {
  const normalized = normalizeText(text);
  const words = normalized.split(" ");
  const ngrams = new Set<string>();
  for (let i = 0; i <= words.length - n; i++) {
    ngrams.add(words.slice(i, i + n).join(" "));
  }
  return ngrams;
};

/** Jaccard similarity between two fingerprints */
const jaccardSimilarity = (a: Set<string>, b: Set<string>): number => {
  const intersection = new Set([...a].filter((x) => b.has(x)));
  const union = new Set([...a, ...b]);
  return union.size === 0 ? 0 : intersection.size / union.size;
};

interface SemanticCacheEntry {
  response: string;
  model: string;
  fingerprint: string[];
  createdAt: number;
  hitCount: number;
}

/** Check the semantic cache for a similar query */
export const checkSemanticCache = async (
  redis: Redis,
  orgId: string,
  model: string,
  messages: Array<{ role: string; content: unknown }>,
  config: SemanticCacheConfig = DEFAULT_CONFIG
): Promise<{ hit: boolean; body?: string; similarity?: number }> => {
  if (!config.enabled) return { hit: false };

  const queryText = extractCacheKey(messages);
  if (!queryText || queryText.length < 10) return { hit: false };

  const queryFingerprint = generateFingerprint(queryText);
  const cacheListKey = `sem-cache:${orgId}:${model}:keys`;

  // Get recent cache entry keys
  const entryKeys = await redis.lrange(cacheListKey, 0, 99);
  if (entryKeys.length === 0) return { hit: false };

  // Check each entry for similarity
  for (const entryKey of entryKeys) {
    const raw = await redis.get(entryKey);
    if (!raw) continue;

    try {
      const entry = JSON.parse(raw) as SemanticCacheEntry;
      const entryFingerprint = new Set(entry.fingerprint);
      const similarity = jaccardSimilarity(queryFingerprint, entryFingerprint);

      if (similarity >= config.similarityThreshold) {
        // Cache hit — update hit count
        entry.hitCount++;
        await redis.set(entryKey, JSON.stringify(entry), "EX", config.ttl);
        return { body: entry.response, hit: true, similarity };
      }
    } catch {}
  }

  return { hit: false };
};

/** Store a response in the semantic cache */
export const storeSemanticCache = async (
  redis: Redis,
  orgId: string,
  model: string,
  messages: Array<{ role: string; content: unknown }>,
  response: string,
  config: SemanticCacheConfig = DEFAULT_CONFIG
): Promise<void> => {
  if (!config.enabled) return;

  const queryText = extractCacheKey(messages);
  if (!queryText || queryText.length < 10) return;

  const fingerprint = [...generateFingerprint(queryText)];
  const entryId = createHash("sha256")
    .update(queryText)
    .digest("hex")
    .slice(0, 16);
  const entryKey = `sem-cache:${orgId}:${model}:${entryId}`;
  const cacheListKey = `sem-cache:${orgId}:${model}:keys`;

  const entry: SemanticCacheEntry = {
    createdAt: Date.now(),
    fingerprint,
    hitCount: 0,
    model,
    response
  };

  await redis.set(entryKey, JSON.stringify(entry), "EX", config.ttl);
  await redis.lpush(cacheListKey, entryKey);
  await redis.ltrim(cacheListKey, 0, config.maxEntries - 1);
  await redis.expire(cacheListKey, config.ttl);
};
