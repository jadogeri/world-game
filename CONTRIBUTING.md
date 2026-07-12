# Contributing to World Game

Thanks for your interest in improving World Game. This guide covers how the project is set up and how to submit changes.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Adding a New Trivia Category](#adding-a-new-trivia-category)
- [Commit Messages](#commit-messages)
- [Submitting a Pull Request](#submitting-a-pull-request)

## Code of Conduct

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to abide by it.

## Getting Started

```bash
pnpm install
pnpm --filter @workspace/db run push        # push the leaderboard schema (dev only)
pnpm --filter @workspace/api-server run dev # API server, port 5000
pnpm --filter @workspace/world-game run dev # frontend, Vite dev server
```

See [README.md](README.md) for the full architecture, API reference, and required environment variables/secrets.

## Project Structure

This is a pnpm workspace monorepo:

- `artifacts/api-server` — Express API (question generation, answer verification, leaderboard).
- `artifacts/world-game` — React/Vite frontend.
- `lib/db` — Drizzle schema + Turso client.
- `lib/api-spec` — `openapi.yaml`, the source of truth for the API contract.
- `lib/api-zod`, `lib/api-client-react` — generated from the OpenAPI spec via Orval; do not hand-edit.

## Development Workflow

1. Run `pnpm run typecheck` before and after your change to confirm you haven't introduced regressions.
2. If you change `lib/api-spec/openapi.yaml`, regenerate the derived packages:
   ```bash
   pnpm --filter @workspace/api-spec run codegen
   ```
3. If you change `lib/db` schema, push it with `pnpm --filter @workspace/db run push` (dev only).
4. Run `pnpm run build` to confirm a full build succeeds.

## Coding Standards

- TypeScript throughout; keep `pnpm run typecheck` clean.
- Validate all request/response data with Zod — do not bypass the generated schemas.
- Country/category data must degrade to `null` rather than throwing when a field is missing; question generation must skip any category with a null answer for a given country.
- Keep files focused — split large React components and route handlers rather than growing a single file indefinitely.

## Adding a New Trivia Category

1. Add the raw source JSON to `artifacts/api-server/src/data/sources/`.
2. Merge it onto the base dataset in `artifacts/api-server/src/lib/countries.ts`, matching by country name and falling back to `null` for unmatched/missing entries.
3. Add the new type to `QuestionType` in `lib/api-spec/openapi.yaml`, then run the codegen command above.
4. Add a case in `artifacts/api-server/src/lib/questions.ts` following the existing null-skip + distractor-filter pattern.
5. Add the type to the appropriate difficulty tier(s) in `TYPES_BY_DIFFICULTY` — exclude it from a tier if too few countries have non-null data to build reliable 4-option questions.

## Commit Messages

Use short, imperative-mood summaries, e.g. `Add population-density trivia category`, `Fix ladder highlight flicker on timer tick`.

## Submitting a Pull Request

1. Fork/branch and make your change.
2. Confirm `pnpm run typecheck` and `pnpm run build` pass.
3. Fill out the [pull request template](pull_request_template.md).
4. Open the PR against `main` and describe what changed and why.

Security issues should **not** be filed as public PRs or issues — see [SECURITY.md](SECURITY.md).
