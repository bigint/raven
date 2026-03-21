# Contributing to Raven

Welcome, and thank you for your interest in contributing to Raven! We appreciate all contributions, whether they are bug reports, feature suggestions, documentation improvements, or code changes.

## Table of Contents

- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Branch Naming](#branch-naming)
- [Commit Convention](#commit-convention)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Code of Conduct](#code-of-conduct)

## How to Contribute

There are many ways to contribute to Raven:

- **Report bugs** by opening a GitHub Issue
- **Suggest features** by opening a GitHub Issue or starting a Discussion
- **Improve documentation** by submitting a pull request
- **Fix bugs** by picking up an existing issue and submitting a pull request
- **Implement features** by working on open issues or proposing new ones
- **Join discussions** to help shape the direction of the project

## Development Setup

### Prerequisites

Ensure you have the following installed:

- **Node.js** 22 or later
- **pnpm** 10.27 or later
- **PostgreSQL** 17
- **Redis** 7

### Getting Started

1. **Fork the repository** on GitHub at [github.com/bigint/raven](https://github.com/bigint/raven).

2. **Clone your fork** locally:

   ```bash
   git clone https://github.com/<your-username>/raven.git
   cd raven
   ```

3. **Install dependencies**:

   ```bash
   pnpm install
   ```

4. **Set up your environment**:

   ```bash
   cp .env.example .env
   ```

   Edit the `.env` file and configure your database connection, Redis URL, and any other required variables.

5. **Run database migrations**:

   ```bash
   pnpm db:migrate
   ```

6. **Start the development server**:

   ```bash
   pnpm dev
   ```

## Branch Naming

Use the following branch naming conventions:

- `feature/*` -- for new features (e.g., `feature/add-rate-limiting`)
- `fix/*` -- for bug fixes (e.g., `fix/virtual-key-validation`)
- `docs/*` -- for documentation changes (e.g., `docs/update-api-reference`)

## Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/). All commit messages should use one of the following prefixes:

- `feat:` -- a new feature
- `fix:` -- a bug fix
- `docs:` -- documentation changes
- `refactor:` -- code changes that neither fix a bug nor add a feature
- `chore:` -- maintenance tasks, dependency updates, CI changes

Examples:

```
feat: add support for Anthropic provider routing
fix: resolve token counting for streaming responses
docs: update environment variable reference
refactor: simplify middleware chain for gateway requests
chore: upgrade dependencies to latest versions
```

## Pull Request Process

1. **Create a branch** from `main` using the naming convention above.
2. **Make your changes** and commit them following the commit convention.
3. **Describe your changes** clearly in the pull request description.
4. **Reference any related issues** (e.g., "Closes #42").
5. **Ensure all checks pass** -- your code must pass linting and type checking before it can be merged.
6. **Keep pull requests focused** -- each PR should address a single concern.
7. **Be responsive to feedback** -- maintainers may request changes during review.

## Code Style

- Follow the conventions defined in [STYLEGUIDE.md](./STYLEGUIDE.md).
- Use **Biome** for linting and formatting. Run it before submitting your PR:

  ```bash
  pnpm lint
  pnpm format
  ```

- Ensure your code passes type checking:

  ```bash
  pnpm typecheck
  ```

## Reporting Bugs

If you find a bug, please open a [GitHub Issue](https://github.com/bigint/raven/issues) and include:

- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior vs. actual behavior
- Your environment details (OS, Node.js version, etc.)
- Any relevant logs or error messages

## Suggesting Features

We welcome feature suggestions. You can:

- Open a [GitHub Issue](https://github.com/bigint/raven/issues) with the "feature request" label
- Start a [GitHub Discussion](https://github.com/bigint/raven/discussions) to gather community feedback before formal proposals

Please include:

- A clear description of the problem the feature would solve
- Your proposed solution or approach
- Any alternatives you have considered

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to oss@bigint.studio.

---

Thank you for contributing to Raven!
