# World Game — Project Documentation

**Who Wants to Be a Millionaire?** — Geography Trivia Game  
Version: 1.0.0 | Platform: TurboRepo (pnpm monorepo)

---

## Table of Contents

| # | Document | Format | Tool |
|---|----------|--------|------|
| 1 | [Sequence Diagram](diagrams/sequence-diagram.md) | Mermaid | Mermaid |
| 2 | [Use Case Diagram](diagrams/use-case/use-case-diagram.md) | Mermaid | Mermaid |
| 3 | [Use Case Description](diagrams/use-case/use-case-description.md) | Markdown | — |
| 4 | [Process Flow Diagram](diagrams/process-flow-diagram.md) | Mermaid | Mermaid |
| 5 | [ERD — Conceptual View](diagrams/erd/erd-conceptual.png) | draw.io XML | draw.io |
| 6 | [ERD — Logical View](diagrams/erd/erd-logical.png) | draw.io XML | draw.io |
| 7 | [ERD — Physical View](diagrams/erd/erd-physical.png) | draw.io XML | draw.io |
| 8 | [Class Diagram](diagrams/class-diagram.md) | Mermaid | Mermaid |
| 9 | [Architecture Layer Diagram](diagrams/architecture-diagram.md) | Mermaid | Mermaid |
| 10 | [Deployment Diagram](diagrams/deployment-diagram.md) | Mermaid | Mermaid |

---

## System Overview

World Game is a geography-based trivia game modeled on *Who Wants to Be a Millionaire?*. Players answer progressively harder geography questions to climb a money ladder. Three lifelines (50/50, Ask the Audience, Ask the Expert) are available per game.

### Monorepo Structure

```
workspace/
├── apps/
│   ├── web/                 # React + Vite frontend
│   └── api/                 # Express v5 REST API
├── packages/
│   ├── api-spec/            # OpenAPI 3.x source of truth (openapi.yaml)
│   ├── api-zod/             # Generated Zod schemas from OpenAPI
│   ├── api-client-react/    # Generated React Query hooks
│   └── db/                  # Drizzle ORM + Turso/LibSQL client
└── documentation/           # This folder
```

### Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 7, Tailwind CSS v4, Wouter, TanStack Query |
| Backend | Express v5, Pino (logging), Zod (validation) |
| Database | Turso (LibSQL / SQLite cloud), Drizzle ORM |
| Shared | OpenAPI 3.x → Zod codegen → React Query codegen |
| Security | AES-256-GCM stateless answer tokens (no DB per-question) |
| Testing | Jest 29, @swc/jest, Vitest, Supertest (unit / integration / e2e) |
| Deployment | Vercel, Render, (pnpm workspace, path-based proxy routing) |

---

## Key Domain Concepts

- **Country** — Static dataset; each country has a name, capital, region, population, area, flag image URL, and currency.
- **Question** — Dynamically generated per request from the country dataset. Never stored. Carries an encrypted token that encodes the correct answer.
- **Answer Token** — AES-256-GCM encrypted + HMAC-authenticated JWT-style payload; encodes `correctIndex`, `correctAnswer`, `questionId`, and `expiresAt`. Prevents client-side tampering.
- **Score** — The only persistent entity; written to Turso after a game ends.
- **Lifeline** — Server-enforced; 50/50 uses the token to derive which two wrong answers to remove; Ask the Audience uses a seeded PRNG (deterministic per token) so repeated calls return identical percentages.


