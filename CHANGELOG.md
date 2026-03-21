# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-03-21

### Added

- Multi-provider AI gateway with OpenAI-compatible API endpoint
- Provider routing for OpenAI, Anthropic, Google, and Mistral
- Virtual API keys with scoped permissions and provider restrictions
- Budget management with per-key and organization-level spending limits
- Rate limiting for API keys and endpoints
- Request analytics with latency metrics, token counts, and cost breakdowns
- Guardrails for prompt injection detection and content filtering
- Full audit logging of configuration changes and administrative actions
- Webhook support for real-time event notifications
- Team and organization management with role-based access control
- Web dashboard for managing providers, keys, routing, and analytics
- Self-hosting support with Docker and Docker Compose
- Database migrations with Drizzle ORM and PostgreSQL
- Transactional email support via Resend
- Cron service for scheduled background tasks
