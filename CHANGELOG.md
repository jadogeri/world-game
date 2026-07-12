# Changelog

All notable changes to World Game are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Six new trivia categories: internet TLD, government type, independence year, national symbol, population density, and predominant religion, merged from supplementary country datasets with null-safe fallback for unmatched countries.

### Changed
- Money-ladder highlight animation now tracks the active row via measured DOM position instead of mount/unmount shared-layout transitions, fixing stutter caused by the per-second countdown timer re-rendering the game screen.

### Fixed
- "National symbol" removed from the Hard difficulty rotation due to insufficient non-null data to reliably generate 4-option questions.

## [0.1.0] - Initial release

### Added
- Core trivia gameplay: 15-level money ladder, safe havens at levels 5 and 10, per-question countdown timer, one 50/50 lifeline, and walk-away banking.
- Stateless question/answer flow using an encrypted, expiring answer token (no server-side session storage).
- Six base trivia categories: flag, capital, continent, currency, national dish, and language.
- Leaderboard (`/scores`) backed by Turso (libsql) via Drizzle ORM.
- OpenAPI spec as the source of truth, with generated Zod schemas and React Query hooks.
