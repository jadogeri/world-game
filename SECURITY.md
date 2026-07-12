# Security Policy

## Supported Versions

World Game is developed on a single rolling `main` branch. Only the latest deployed version is supported with security fixes.

| Version | Supported |
|---------|-----------|
| latest (`main`) | ✅ |
| older commits | ❌ |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it privately rather than opening a public issue or pull request. Include:

- A description of the vulnerability and its potential impact.
- Steps to reproduce, or a proof of concept.
- Any suggested remediation, if known.

You can expect an initial acknowledgment within a few business days. Please allow time for a fix to be developed and released before any public disclosure.

## Known Design Tradeoffs

These are intentional, documented tradeoffs rather than open vulnerabilities — flagged here for transparency:

- **Leaderboard scores are client-reported, not server-verified.** A malicious client could submit an inflated score. Acceptable for a casual, no-auth trivia game; hardening this would require a server-side session-tracking redesign.
- **No user authentication.** The game has no accounts or personal data beyond a freeform display name on the leaderboard.

## Security Measures in Place

- Correct answers are never sent to the client in plaintext: each question's answer token is encrypted (AES-256-GCM) and expires after 5 minutes.
- All API request/response payloads are validated with Zod schemas generated from the OpenAPI spec.
- Secrets (`SESSION_SECRET`, `TURSO_AUTH_TOKEN`) are managed as environment secrets and are never committed to the repository.
