<div align="center">

# Raven

**Take control of your AI spending. One API, every provider, full visibility.**

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/docker/pulls/yoginth/raven)](https://hub.docker.com/r/yoginth/raven)
[![CI](https://github.com/bigint/raven/actions/workflows/ci.yml/badge.svg)](https://github.com/bigint/raven/actions/workflows/ci.yml)

[Get Started](#get-started) | [Documentation](https://raven.yoginth.com) | [Self-Host](#self-host-with-docker)

</div>

---

## What is Raven?

Raven is an open-source AI gateway that sits between your apps and LLM providers like OpenAI and Anthropic. Instead of managing multiple API keys, juggling provider SDKs, and guessing how much you're spending, Raven gives you one unified endpoint with complete control.

**No code changes required.** Raven is fully compatible with the OpenAI API format, so any app or tool that works with OpenAI works with Raven out of the box.

## Why Raven?

- **One API for every provider** -- Use OpenAI, Anthropic, and more through a single endpoint. Switch providers without changing your code.
- **Know exactly what you're spending** -- See cost breakdowns per key, per user, and per model in real time. No more surprise bills.
- **Set budgets and rate limits** -- Create virtual API keys with spending caps and rate limits. Give your team access without giving away the farm.
- **Keep your prompts safe** -- Built-in guardrails detect prompt injection attempts and filter harmful content before it reaches your models.
- **See everything** -- Every request is logged with latency, token counts, and costs. Debug issues in seconds, not hours.
- **Stay in control** -- Full audit trail of who changed what and when. Get notified of events via webhooks.
- **Manage your team** -- Invite team members, assign roles, and organize access with built-in team management.
- **Own your data** -- Self-host on your own infrastructure. Your prompts and data never leave your servers.

## Get Started

### 1. Run Raven

The fastest way to get up and running:

```bash
docker run -d --name raven -p 3000:3000 -p 4000:4000 yoginth/raven:latest
```

Or use Docker Compose for the full setup with a database:

```bash
curl -O https://raw.githubusercontent.com/bigint/raven/main/docker-compose.yml
docker compose up
```

### 2. Open the Dashboard

Go to **http://localhost:3000** to set up your account and connect your first provider.

### 3. Create a Virtual Key

In the dashboard, create a virtual API key. Set a budget, choose which providers it can access, and copy the key.

### 4. Start Making Requests

Point your existing tools at Raven's API (`http://localhost:4000`) using your virtual key. That's it -- no SDK changes needed.

```bash
curl http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer your-virtual-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## Self-Host with Docker

Raven is designed to run anywhere Docker runs. The `docker-compose.yml` includes everything you need: the Raven app, PostgreSQL, and Redis.

For detailed deployment guides covering production setups, environment variables, and scaling, see the [self-hosting docs](https://raven.yoginth.com).

## Documentation

Visit **[raven.yoginth.com](https://raven.yoginth.com)** for guides on:

- Connecting providers (OpenAI, Anthropic, and more)
- Managing virtual API keys and budgets
- Setting up guardrails and content filtering
- Team management and access control
- API reference

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for how to get started.

## License

Raven is open-source under the [MIT License](LICENSE).

Copyright 2026 BigInt Studio.
