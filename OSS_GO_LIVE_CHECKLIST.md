# OSS Go-Live Checklist

Pre-release checklist for open-sourcing the Raven platform. Each section must be completed before the public repository is made available.

---

## Security Audit

- [ ] Remove all real API keys, secrets, and tokens from `.env` (Lemon Squeezy JWT, Raven API key, Railway connection strings)
- [ ] Audit git history for leaked secrets — use `git filter-repo` or BFG Repo Cleaner to scrub if found
- [x] Verify `.gitignore` covers all sensitive files (`.env`, `.env.*`, credentials, private keys)
- [x] Confirm `.env.example` uses only placeholder values with no real credentials
- [ ] Run a secrets scanner (e.g., `trufflehog`, `gitleaks`) against the full repo history
- [x] Review all hardcoded URLs, IPs, and internal hostnames — replace with configurable env vars
- [x] Check Docker entrypoint and compose files for embedded secrets
- [x] Ensure no internal infrastructure details (VPC IDs, internal domains, database hostnames) are exposed

## Documentation

- [x] Create `README.md` with project overview, features, architecture diagram, quick start, and badges
- [x] Create `CONTRIBUTING.md` with contribution workflow, branch strategy, PR process, and code style expectations
- [x] Create `CODE_OF_CONDUCT.md` (Contributor Covenant recommended)
- [x] Create `SECURITY.md` with vulnerability disclosure policy and contact information
- [x] Create `CHANGELOG.md` with initial release entry
- [ ] Review and update `STYLEGUIDE.md` for external contributor readability
- [ ] Verify `apps/docs` (Mintlify) is accurate and covers self-hosting setup
- [ ] Add inline code comments for complex or non-obvious logic

## Repository Metadata

- [x] Add `repository`, `homepage`, `bugs`, `description`, `keywords`, and `license` fields to root `package.json`
- [x] Verify `LICENSE` file is present and correct (Apache 2.0)
- [ ] Ensure all sub-packages reference the correct license
- [ ] Add repository topics/tags on GitHub (e.g., `ai-gateway`, `llm`, `typescript`, `open-source`)
- [ ] Write a clear, concise repository description on GitHub
- [ ] Set the repository URL as the homepage if no separate landing page exists

## CI/CD & Automation

- [x] Create GitHub Actions workflow for CI (lint, typecheck, build) on pull requests
- [x] Create GitHub Actions workflow for Docker image builds on release tags
- [ ] Add branch protection rules for `main` (require PR reviews, status checks)
- [x] Create `.github/ISSUE_TEMPLATE/` with bug report, feature request, and question templates
- [x] Create `.github/PULL_REQUEST_TEMPLATE.md` with description, testing, and checklist sections
- [ ] Add `.github/FUNDING.yml` if sponsorship is desired
- [x] Configure Dependabot or Renovate for dependency updates
- [ ] Add a `release` workflow or use a tool like `changesets` for versioned releases

## Code Quality

- [x] Run `pnpm lint` and fix all linting errors
- [x] Run `pnpm typecheck` and resolve all type errors
- [x] Run `pnpm build` and confirm all apps and packages build successfully
- [ ] Remove dead code, unused dependencies, and commented-out blocks
- [ ] Remove any internal-only tooling, scripts, or references
- [ ] Verify all TODO/FIXME/HACK comments — resolve or convert to GitHub issues
- [x] Ensure consistent formatting across the codebase (`pnpm format`)

## Local Development Experience

- [ ] Verify `pnpm install` works cleanly from a fresh clone
- [ ] Verify `docker compose up` brings up the full stack (PostgreSQL, Redis, API, Web)
- [ ] Verify `pnpm dev` starts all apps correctly
- [ ] Verify database migrations run without errors (`pnpm db:push` or `pnpm db:migrate`)
- [x] Document required system dependencies (Node.js version, pnpm version, Docker)
- [ ] Test the onboarding flow end-to-end as a new user
- [x] Confirm `.env.example` has every required variable with clear descriptions

## Licensing & Legal

- [x] Confirm Apache 2.0 is the intended license for all code
- [ ] Add license headers to source files if required by policy
- [ ] Audit all dependencies for license compatibility (no GPL in an Apache project unless isolated)
- [ ] Verify no proprietary or vendor-specific code is included that shouldn't be open-sourced
- [ ] Check for any CLA (Contributor License Agreement) requirements and set up if needed
- [x] Confirm `bigint` or org name is correctly attributed in the `LICENSE` file

## Community Readiness

- [ ] Set up GitHub Discussions or link to a community channel (Discord, Slack, etc.)
- [ ] Create a public roadmap (GitHub Projects, Notion, or `ROADMAP.md`)
- [ ] Prepare an initial set of `good first issue` labels for onboarding contributors
- [ ] Designate maintainers and define response time expectations
- [ ] Draft an announcement post (blog, Twitter/X, Hacker News, Reddit, etc.)
- [ ] Set up issue triage labels (bug, enhancement, question, good first issue, help wanted)

## Infrastructure & Deployment

- [ ] Verify Docker image builds and runs correctly in isolation
- [ ] Document self-hosting requirements (minimum CPU, RAM, disk)
- [x] Provide example deployment configs (Docker Compose for production, Kubernetes manifests if applicable)
- [ ] Document environment variable reference with descriptions, defaults, and required/optional flags
- [ ] Ensure database schema is stable — publish migration strategy for future updates
- [ ] Test a clean deployment from scratch using only public documentation

## Final Pre-Launch

- [ ] Do a full clone into a clean directory and follow the README from scratch
- [ ] Have someone unfamiliar with the project attempt setup using only the docs
- [ ] Review the repository as a visitor would — check the About section, pinned issues, and first impressions
- [ ] Squash or clean up any WIP commits on `main`
- [ ] Tag the initial release (`v0.1.0` or `v1.0.0`)
- [ ] Flip the repository from private to public
- [ ] Publish the announcement
