<div align="center">

<br />

# Raven

**One API, every provider, full visibility.**

Raven is an open-source AI gateway that sits between your apps and LLM providers. Stop juggling API keys, guessing costs, and worrying about prompt safety. Raven handles all of it.

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/docker/pulls/yoginth/raven)](https://hub.docker.com/r/yoginth/raven)
[![CI](https://github.com/bigint/raven/actions/workflows/ci.yml/badge.svg)](https://github.com/bigint/raven/actions/workflows/ci.yml)

[Get Started](#get-started) · [Documentation](https://raven.yoginth.com) · [Self-Host](#self-host-with-docker)

</div>

<br />

## Why Raven?

**Ship faster without losing control.** Teams building with LLMs need more than raw API access -- they need visibility, safety, and cost management. Raven gives you all three without touching your existing code.

- **Unified API** -- Use OpenAI, Anthropic, Google, and more through a single endpoint. Switch providers by changing a model name, not your codebase.
- **Real-time Cost Tracking** -- See spending per key, per user, and per model as it happens. No more end-of-month surprises.
- **Budgets & Rate Limits** -- Create virtual API keys with spending caps. Give your team access without giving away the farm.
- **Built-in Guardrails** -- Detect prompt injection and filter harmful content before it reaches your models.
- **Full Observability** -- Every request logged with latency, tokens, and cost. Debug in seconds, not hours.
- **Audit Trail & Webhooks** -- Know who changed what, when. Get notified of the events that matter.
- **Team Management** -- Invite members, assign roles, and organize access from the dashboard.
- **Self-Hosted** -- Deploy on your infrastructure. Your prompts and data never leave your servers.

## Get Started

### 1. Run Raven

```bash
docker run -d --name raven -p 3000:3000 -p 4000:4000 yoginth/raven:latest
```

Or use Docker Compose for the full setup with a database:

```bash
curl -O https://raw.githubusercontent.com/bigint/raven/main/docker-compose.yml
docker compose up
```

### 2. Open the Dashboard

Go to `http://localhost:3000` to set up your account and connect your first provider.

### 3. Create a Virtual Key

Create a virtual API key from the dashboard. Set a budget, choose which providers it can access, and copy the key.

### 4. Make Requests

Point your existing tools at Raven -- no SDK changes needed.

```bash
curl http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer your-virtual-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

> Fully compatible with the OpenAI API format. Any app or tool that works with OpenAI works with Raven out of the box.

## Self-Host with Docker

Raven runs anywhere Docker runs. The `docker-compose.yml` includes everything you need: the app, PostgreSQL, and Redis.

For production deployments, environment variables, and scaling, see the [self-hosting guide](https://raven.yoginth.com/docs/guides/self-hosting).

## Documentation

Visit **[raven.yoginth.com](https://raven.yoginth.com)** for the full docs.

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for how to get started.

## License

Raven is open-source under the [MIT License](LICENSE).

Copyright 2026 BigInt Studio.
