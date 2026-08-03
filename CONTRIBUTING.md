# Contributing

Thank you for helping make Hermes Todo calmer, safer, and easier to self-host.

## Before opening a change

Use an issue for product or protocol changes. Security reports belong in GitHub Private Vulnerability Reporting, never a public issue. Keep v0.1’s boundary: one shared workspace, Telegram auth, existing Hermes, and no SaaS/multitenancy.

## Local checks

```bash
npm ci
npm test
npm run test:python
npm run build
npm audit --audit-level=high
npm run release:scan
```

Add behavior tests before changing an API seam. Never use real Telegram tokens, private tasks, browser profiles, `.env`, or production databases as fixtures. `npm run dev:demo` must remain loopback-only and synthetic.

## Pull requests

- Explain user-visible behavior and security impact.
- Update EN and RU docs together when behavior changes.
- Update `docs/openapi-agent.yaml` for Agent API changes.
- Add a migration instead of mutating existing migration history.
- Keep secrets out of logs and screenshots.
- Confirm the source/release allowlist check is green.

By participating, you agree to the [Contributor Covenant](CODE_OF_CONDUCT.md).
