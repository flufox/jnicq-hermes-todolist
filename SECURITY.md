# Security policy

## Supported versions

Security fixes are provided for the latest released minor version. Before the first public release, `main` is the only supported line.

## Report a vulnerability privately

Do not open a public issue. Use **Security → Report a vulnerability** in this GitHub repository (Private Vulnerability Reporting). Include affected version, impact, reproduction steps, and any suggested mitigation. If Private Vulnerability Reporting is unavailable, contact the repository owner through the private address listed in the GitHub profile and avoid sending secrets or household data.

You should receive an acknowledgement within 72 hours and a status update within seven days. Coordinated disclosure timing will be agreed with the reporter.

## Deployment expectations

- Expose the Mini App only through HTTPS.
- Keep `secrets/`, SQLite, and backups readable only by the service account.
- Use full-disk encryption: task contents are plaintext inside SQLite.
- Never put Telegram, agent, Google, or backup secrets in `.env`, issues, logs, or screenshots.
- Run one application replica; v0.1.0 does not support clustered writers.
- Run `./hermes-todo doctor`, keep Docker/OS current, and review dependency alerts.

The project does not claim that passing automated scanners makes a deployment secure. See [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md).
