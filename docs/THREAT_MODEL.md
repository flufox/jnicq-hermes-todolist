# Threat model

## Assets

- household task titles, notes, assignments, and schedules;
- Telegram bot token and verified Telegram identity;
- hashed invites and Agent API tokens plus their one-time plaintext values;
- Google OAuth client secret and refresh token;
- SQLite database, backups, and master encryption key.

## Trust boundaries

1. Telegram sends untrusted `initData` to the browser; the server verifies HMAC and time bounds.
2. Hermes sends untrusted user-derived arguments through a scoped bearer-token API.
3. Google Calendar contains untrusted text and remote mutable state.
4. Caddy terminates public TLS before forwarding to the private app network.
5. Host filesystem permissions protect plaintext SQLite and secret files.

## Primary threats and controls

| Threat | Control | Residual risk |
| --- | --- | --- |
| Forged/replayed Telegram identity | Official HMAC construction, constant-time comparison, 24-hour age and 5-minute future skew | A stolen fresh `initData` remains useful until expiry |
| Invite guessing/brute force | Random one-time codes, hash-only storage, expiry/revoke, independent per-IP and per-Telegram-identity rate limits | Distributed attempts require edge-level monitoring |
| Agent token theft | 32 random bytes, hash-only DB storage, scopes, revoke/rotate, HTTPS requirement | Plaintext token exists in the Hermes environment/secret file |
| Indirect prompt injection | Notes opt-in, untrusted-data markers, bounded normalization, no hard-delete tool | Hermes may still reason poorly about malicious titles |
| Stale concurrent edits | Optimistic task versions and HTTP 409 | User must retry after refresh |
| Google conflict/data loss | Dedicated calendar, ETags, `needs_attention`, archive instead of hard-delete | Admin resolution is manual in v0.1 |
| Secret leakage in image/context | Explicit Docker COPY, strict ignore files, release allowlist scan | Host operator can still add secrets before release |
| Container breakout | Non-root app/workers, read-only rootfs, cap-drop all, only `NET_BIND_SERVICE` restored for Caddy, no-new-privileges, minimal mounts | Kernel/container runtime vulnerabilities remain |
| Disk theft | Owner-only permissions and recommendation for full-disk encryption | Task fields are plaintext in SQLite |
| Backup corruption | SQLite backup API, authenticated encryption, integrity check, pre-restore snapshot | Passphrase loss makes portable backups unrecoverable |

## Out of scope

Compromised host root, compromised Telegram/Google accounts, denial-of-service beyond basic rate limits, clustered/multi-region operation, and malicious project maintainers are outside the v0.1 threat model.

## Release gate

No known Critical/High issue may remain open. Every Medium requires an owner, decision, and review date. Automated scans support review but do not replace it.
