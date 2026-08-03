# Architecture

Hermes Todo is a single-workspace, single-replica application.

```text
Telegram / other Hermes channel
            │
            ▼
      Hermes Agent 0.16.x
            │ six plugin tools
            ▼
  /api/agent/v1 (scoped token)
            │
            ▼
        Express 5 ───── authenticated SSE ───── Telegram Mini App
            │
            ▼
 better-sqlite3 (WAL, FK, busy timeout, migrations, optimistic versions)
            │
            ├── daily/weekly backup worker
            └── optional Google Calendar worker
```

## Boundaries

- Browser API: `/api/v1/*`, authenticated with verified Telegram Mini App `initData` and workspace membership.
- Agent API: `/api/agent/v1/*`, authenticated with a hashed bearer token and explicit scopes.
- Storage: one SQLite database, one writer replica, transactions around multi-table task mutations.
- Change notifications: SSE sends identifiers/revisions only; clients refetch authorized state.
- Calendar: a separate profile mounts only the database and master key. It receives no Telegram or Agent API token.

## Domain model

`workspace` is the shared aggregate and the matching UI term. `Task.schedule` is either `null`, date-only, or timed. Assignments and tags are normalized join tables. Task `version` rejects stale writes; workspace `revision` drives reconciliation.

## Migration policy

`schema_migrations` records monotonically numbered migrations. Published migrations are immutable. Migrations run transactionally at process start before readiness succeeds.

## Deployment

Caddy is the default HTTPS edge. The external-proxy profile binds a local reverse proxy only to `127.0.0.1`. Application and workers run as non-root with read-only root filesystems, all Linux capabilities dropped, `no-new-privileges`, bounded tmpfs, named data volumes, and minimal secret mounts. Caddy uses the same hardening but retains only `NET_BIND_SERVICE` for its listener ports.
