# bigRAG SDK Update Requirements

## SDK Update Needed

The `@bigrag/client` TypeScript SDK (v0.0.1) needs updates for new bigRAG features:

- `CreateCollectionBody`: Add `reranking_enabled`, `reranking_model`, `reranking_api_key`
- `QueryBody`: Add `search_mode` ("semantic" | "keyword" | "hybrid"), `rerank` (boolean override)
- New method: `multiQuery({ query, collections, top_k?, ... })` for multi-collection search
- New method: `batchQuery({ queries: [...] })` for parallel queries
- New method: `getAnalytics(collection)` for collection stats
- New method: `collection(name)` for scoped client
- Webhook management methods: `createWebhook()`, `listWebhooks()`, etc.
