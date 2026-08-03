# Changelog

All notable changes follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This project uses semantic versioning.

## [Unreleased]

## [0.1.0] - 2026-08-03

### Added

- Single-workspace Telegram Mini App with EN/RU UI, shared tasks, assignments, tags, schedules, archive, and live refresh.
- Versioned browser and Agent APIs with optimistic task versions and scoped hashed tokens.
- Hermes Agent 0.16.x plugin with six reversible task tools.
- SQLite WAL storage, numbered migrations, audit events, one-time invites, and admin controls.
- Optional dedicated Google Calendar OAuth/PKCE integration with encrypted credentials and conflict marking.
- Hardened Compose profiles, setup/doctor/backup/restore CLI, and encrypted portable backups.
- Security workflows pinned to immutable action commits, including the post-incident Trivy v0.36.0 action chain.
- Restored the full calendar-first product experience with 7/14/28/custom ranges, compact/large layouts, selected-day agenda, backlog, completed activity, archive, day view, task editor, assignments, tags, and safe drag rescheduling.
- Added real anonymized Chromium screenshots for desktop and Telegram viewports, responsive EN/RU and light/dark QA, and zero-violation automated accessibility checks for the primary views.
- Made the root installer use the public repository URL required by Hermes and made updateable application services pull the versioned GHCR image.
- Added BuildKit SBOM/provenance output before keyless release-image signing and refreshed CodeQL Actions to an immutable v4 commit.
- Prepared setup mounts and private host directories before the first non-root container run so fresh installations can create their database and secret files safely.
- Redacted OAuth and token query values from Caddy access logs.
- Replaced the Agent Bearer regex with a bounded parser, added a rate limit to the SPA filesystem fallback, and upgraded stored invite/token verifiers to individually salted `scrypt` hashes.

### Fixed

- Made the Alpine image build native Node modules with an explicit Python/C++ toolchain.
- Made Docker Desktop Compose secrets and fresh named volumes pass the same fail-closed permission checks used on Linux hosts.
- Restored the single `NET_BIND_SERVICE` capability required by the hardened Caddy profiles.

[Unreleased]: https://github.com/flufox/jnicq-hermes-todolist/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/flufox/jnicq-hermes-todolist/releases/tag/v0.1.0
