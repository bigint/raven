# Raven Platform Monorepo - Claude Instructions

## Style Guide

All coding guidelines, patterns, and conventions are documented in **[STYLEGUIDE.md](./STYLEGUIDE.md)**. Follow the rules and patterns defined there.

## Documentation

**Always update the docs site when making any code change.** This includes adding, updating, or removing features, endpoints, models, config options, or CLI flags. The docs live in `apps/docs/content/docs/` as `.mdx` files.

Pages to keep in sync:

- `api-reference/` — endpoint signatures, request/response schemas, error codes
- `features/` — feature explanations and examples
- `getting-started/` — setup instructions and configuration
- `guides/` — usage guides and walkthroughs
- `security/` — authentication, permissions, and security features

If a feature is removed, remove it from the docs too. Never leave stale references.

## BigRAG

BigRAG is the RAG engine used in Raven. Documentation is available at **https://bigrag.yoginth.com** and via the **Context7 MCP server**. Always consult BigRAG docs (via Context7 or the docs site) when working with or referring to BigRAG functionality.