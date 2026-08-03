# Security review log

## 2026-07-31 — local v0.1.0 RC review

Scope: source, auth boundaries, dependencies, workflows, Docker/Compose, Hermes tools, Google OAuth/sync, backup/restore, and release allowlist.

- Critical: 0 known
- High: 4 found and resolved in the RC: the previously pinned Trivy Action transitively invoked the mutable, incident-affected `setup-trivy@v0.2.1`; the Agent Bearer parser admitted polynomial whitespace matching; the SPA filesystem fallback had no dedicated rate limit; and secret verifiers used a fast hash despite API tokens being 256-bit random values. The action chain is now immutable and remediated, Bearer parsing is bounded, the fallback is rate-limited, and invite/token verifiers use individually salted `scrypt` hashes with constant-time comparison.
- Medium: 6 found and resolved in the RC: security-path CODEOWNERS, independent invite limits by IP and Telegram identity, untrusted-data markers on every task-returning Hermes tool, control-character rejection for setup values written to `.env`, access-log redaction for OAuth and token query values, and an ambiguous conditional Agent-auth flow removed together with the bounded Bearer parser change
- Release reliability defects fixed during the same review: worker-specific healthchecks, Home-timezone backup slots, Home-timezone Agent date filtering, SSE backoff after clean disconnects, a license-scan false failure for the private root package, a non-installable local-path Hermes plugin command, updater images that previously had no pullable registry source, and first-run ownership preparation for setup volumes and secret directories
- Next review date: 2026-08-29 or before the first public release, whichever comes first

The Trivy finding was caught before the repository had any commit, remote, or workflow run, so this repository did not execute the affected dependency. Reference: [Aqua Security advisory GHSA-69fq-xp46-6x23](https://github.com/aquasecurity/trivy/security/advisories/GHSA-69fq-xp46-6x23).

Evidence run locally: 46 TypeScript/Vitest tests and 3 Python plugin tests, production TypeScript/Vite build, `npm audit` with zero reported vulnerabilities, production dependency license allowlist, checksum-verified Gitleaks v8.30.1 against the staged release manifest, synthetic loopback HTTP/readiness smoke, and PII/legacy/source allowlist scan.

Additional local evidence: checksum-verified CodeQL CLI/bundle v2.25.5 security-and-quality suites reported zero results across 34/34 JavaScript/TypeScript files, 5/5 Python files, and 3/3 GitHub Actions files. Checksum-verified Trivy v0.72.0 reported zero Critical/High package findings, zero Dockerfile misconfigurations, and no detected secrets; a CycloneDX 1.7 SBOM was generated and parsed; every Compose profile rendered successfully with the checksum-verified Docker Compose v5.3.1 standalone binary; the Caddyfile passed the checksum-verified Caddy v2.10.0 validator; and Hermes Agent 0.16.0 discovered all six plugin tools in an isolated installation. Chromium QA covered 1365×900 and 390×844 layouts, task creation, complete/reopen, archive/restore, editor, day view, settings, EN/RU, light/dark themes, calendar ranges, and reconnect-backed refresh. Axe reported zero automated violations in desktop, mobile, editor, and settings views; gradient-backed contrast remains a manual review item because automated computation was inconclusive.

Not completed locally: starting the real containers or running an Ubuntu fresh install because this machine has no Docker/WSL runtime, GitHub-hosted workflow execution, keyless image signing, a real Telegram device flow, and an end-to-end Telegram → Hermes voice → Mini App flow. Pinned GitHub Actions jobs are configured, but they are not considered evidence until they run on GitHub.

## 2026-08-03 — pre-release follow-up

- The stabilized release tree passed 57/57 TypeScript/Vitest tests across 14 files, 3/3 Python plugin tests, the production TypeScript/Vite build (1,586 modules), and the release allowlist scan.
- A strict UTF-8 and signature scan covered 80 release files with zero invalid files and zero secret-signature hits. The English and Russian README links, fragments, and seven new screenshot assets were also checked locally.
- Docker Desktop 4.84.0 was installed on the Windows verification machine. Docker Client 29.6.2 and Docker Compose v5.3.1 are available, and both the default and all-profile Compose configurations pass `docker compose config --quiet` with `.env.example`.
- After the required reboot, Docker Desktop started its WSL2 engine and the real Compose build completed. Runtime smoke covered healthy `app`, `backups`, and `calendar` services, HTTP 200 readiness, the non-root application UID, read-only root filesystems, `cap_drop: ALL`, `no-new-privileges`, and the external Caddy proxy returning both readiness JSON and the HTML application through a loopback-only host port.
- The runtime pass exposed and resolved three release defects: the Alpine build lacked the Python/C++ toolchain required by `better-sqlite3`; Docker Desktop ignores Compose secret `uid`/`gid`/`mode` fields and fresh named volumes start with broader modes; and Caddy could not execute after all capabilities were removed. Docker secret mounts are now narrowly recognized under canonical `/run/secrets` paths, writable volumes are normalized to `0700` and rechecked, and Caddy receives only `NET_BIND_SERVICE`.
- Still unverified locally: GitHub-hosted workflow execution, keyless image signing, a public-domain TLS issuance run, an Ubuntu fresh install, a real Telegram device flow, and an end-to-end Telegram → Hermes voice → Mini App flow.
- The Hermes plugin setup URL was corrected to use the public origin without duplicating `/api/agent/v1`. An isolated Hermes Agent 0.16.0 install confirmed that the manifest's URL and masked-token prompts persist both values across fresh processes; the launcher now avoids session-only exports, attempts the required gateway restart, and has regression assertions for this contract.

This is an AI-assisted review and not a professional penetration test.
