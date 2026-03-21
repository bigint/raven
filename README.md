<div align="center">

# Raven

**Open-source AI gateway for routing, managing, and observing LLM API traffic.**

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Docker](https://img.shields.io/docker/pulls/yoginth/raven)](https://hub.docker.com/r/yoginth/raven)
[![CI](https://github.com/bigint/raven/actions/workflows/ci.yml/badge.svg)](https://github.com/bigint/raven/actions/workflows/ci.yml)

[Documentation](https://docs.ravenplatform.com) | [Quick Start](#quick-start) | [Self-Host](#docker-deployment) | [Contributing](CONTRIBUTING.md)

</div>

---

## Overview

Raven is a self-hostable AI gateway that sits between your applications and LLM providers. It gives you a single, OpenAI-compatible API endpoint to route requests across multiple providers while providing full visibility into usage, costs, and performance.

Whether you are managing API keys across a team, enforcing budgets and rate limits, or monitoring prompt traffic for safety, Raven provides the control plane you need to operate LLMs in production.

## Features

- **Multi-provider routing** -- Send requests to OpenAI, Anthropic, Google, and Mistral through a unified, OpenAI-compatible API endpoint.
- **Virtual API keys** -- Issue scoped keys with per-key budgets, rate limits, and provider restrictions.
- **Analytics and logging** -- Track every request with detailed logs, latency metrics, token counts, and cost breakdowns.
- **Guardrails** -- Detect prompt injection attempts and filter content before it reaches your models.
- **Audit logs** -- Maintain a full audit trail of configuration changes and administrative actions.
- **Webhooks** -- Get notified of events in real time via configurable webhook endpoints.
- **Team management** -- Organize users into teams with role-based access control.
- **Self-hostable** -- Deploy anywhere with Docker. You own your data.

## Architecture

Raven is structured as a monorepo managed with pnpm workspaces and Turborepo.

### Apps

| Directory | Description | Stack |
|-----------|-------------|-------|
| `apps/web` | Dashboard | Next.js 16, React 19, Tailwind CSS 4 |
| `apps/api` | API server | Hono, Node.js 22 |
| `apps/cron` | Scheduled tasks | Node.js |
| `apps/docs` | Documentation site | Mintlify |

### Packages

| Directory | Description |
|-----------|-------------|
| `packages/auth` | Authentication (Better Auth) |
| `packages/config` | Configuration and validation (Zod) |
| `packages/db` | Database schema and migrations (Drizzle ORM + PostgreSQL) |
| `packages/data` | Data access layer |
| `packages/email` | Transactional email (React Email + Resend) |
| `packages/types` | Shared TypeScript type definitions |
| `packages/ui` | Component library (Base UI) |

### Tech Stack

- **Language:** TypeScript 5.9
- **Frontend:** Next.js 16, React 19, Tailwind CSS 4, Base UI
- **Backend:** Hono, Node.js 22, Better Auth, Drizzle ORM
- **Database:** PostgreSQL 17, Redis 7
- **AI SDKs:** Anthropic, Google, Mistral, OpenAI
- **Email:** Resend + React Email
- **Tooling:** pnpm, Turborepo, Biome

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm 10.27+
- PostgreSQL 17
- Redis 7

### Local Development

```bash
git clone https://github.com/bigint/raven.git
cd raven
pnpm install
cp .env.example .env
```

Edit `.env` with your database credentials and any required API keys. See the [Environment Variables](#environment-variables) section for details.

```bash
pnpm db:migrate
pnpm dev
```

The dashboard will be available at `http://localhost:3000` and the API server at `http://localhost:3001`.

### Docker Deployment

```bash
docker compose up
```

This starts all services including PostgreSQL and Redis. The dashboard is available at `http://localhost:3000` and the API at `http://localhost:3001`.

## Environment Variables

All environment variables are documented in the `.env.example` file at the root of the repository. Copy it to `.env` and fill in the required values before starting the application.

```bash
cp .env.example .env
```

At a minimum, you will need to configure:

- Database connection (PostgreSQL)
- Redis connection
- At least one LLM provider API key

Refer to `.env.example` for the full list of supported variables and their descriptions.

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all apps and packages |
| `pnpm lint` | Lint the codebase with Biome |
| `pnpm typecheck` | Run TypeScript type checks |
| `pnpm format` | Format code with Biome |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:studio` | Open Drizzle Studio for database inspection |

## Documentation

Full documentation is available at [docs.ravenplatform.com](https://docs.ravenplatform.com), covering:

- API reference
- Provider configuration
- Virtual key management
- Guardrails setup
- Self-hosting guides
- Team and organization management

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to get started, submit issues, and open pull requests.

## License

Raven is open-source software licensed under the [Apache License 2.0](LICENSE).

Copyright 2025 Bigint Studio.
