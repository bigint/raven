# Raven TypeScript SDK

## Overview
TypeScript SDK for the Raven AI Gateway. Provides a type-safe client for chat completions, embeddings, model listing, and admin operations.

## Development

```bash
pnpm install    # Install dependencies
pnpm build      # Build with tsup (ESM + CJS + DTS)
pnpm test       # Run tests with vitest
pnpm lint       # Lint with biome
pnpm format     # Format with biome
```

## Architecture
- `src/client.ts` - Main `Raven` class with all API methods
- `src/types.ts` - All TypeScript interfaces and the `RavenError` class
- `src/streaming.ts` - SSE stream parser for chat completion streaming
- `src/providers.ts` - Provider-specific helpers and capability queries
- `src/index.ts` - Public API exports

## Conventions
- Zero runtime dependencies (uses native `fetch`)
- Strict TypeScript, no `any`
- Single quotes, no semicolons, 2-space indent (enforced by biome)
- All API methods return typed promises
- Errors are thrown as `RavenError` instances with `status` and `code`
- Retry logic: exponential backoff on 429/500/502/503/504, max 3 retries
- Tests use vitest with mocked fetch
