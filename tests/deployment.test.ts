import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("production deployment hardening", () => {
  const compose = readFileSync(new URL("../compose.yaml", import.meta.url), "utf8");
  const dockerfile = readFileSync(new URL("../Dockerfile", import.meta.url), "utf8");
  const securityWorkflow = readFileSync(
    new URL("../.github/workflows/security.yml", import.meta.url),
    "utf8",
  );
  const ciWorkflow = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
  const cli = readFileSync(new URL("../cli/index.ts", import.meta.url), "utf8");
  const serverEntry = readFileSync(new URL("../server-src/index.ts", import.meta.url), "utf8");
  const launcher = readFileSync(new URL("../hermes-todo", import.meta.url), "utf8");
  const pluginManifest = readFileSync(new URL("../plugin.yaml", import.meta.url), "utf8");
  const caddyfile = readFileSync(new URL("../Caddyfile", import.meta.url), "utf8");

  test("workers override the app HTTP healthcheck", () => {
    const backups = compose.slice(compose.indexOf("  backups:"), compose.indexOf("  caddy:"));
    const calendar = compose.slice(compose.indexOf("  calendar:"), compose.indexOf("  setup:"));
    expect(backups).toContain("healthcheck:");
    expect(backups).toContain("process.kill(1, 0)");
    expect(calendar).toContain("healthcheck:");
    expect(calendar).toContain("process.kill(1, 0)");
  });

  test("the image build uses explicit COPY instructions and a pinned base digest", () => {
    expect(dockerfile).toMatch(/^FROM node:[^\s]+@sha256:[a-f0-9]{64}/m);
    expect(dockerfile).not.toMatch(/^COPY\s+\.\s+/m);
    expect(dockerfile).not.toMatch(/^ADD\s+/m);
    expect(dockerfile).toContain("/workspace/data /workspace/backups /workspace/secrets");
    expect(dockerfile).toContain("chown -R node:node /app /workspace");
  });

  test("native dependencies have a toolchain before npm rebuild runs", () => {
    expect(dockerfile).toContain("RUN apk add --no-cache python3 make g++");
    expect(dockerfile).toContain("FROM native-build AS dependencies");
    expect(dockerfile).toContain("FROM native-build AS production-dependencies");
  });

  test("Docker secret mounts are accepted without weakening ordinary host file checks", () => {
    expect(serverEntry).toContain("isDockerSecretMountPath(realpathSync(path))");
    expect(serverEntry).toContain("path === config.masterKeyPath");
    expect(serverEntry).toContain("if (!isMasterKey) chmodSync(path, 0o700)");
    expect(serverEntry).toContain("(statSync(path).mode & 0o077) !== 0 && !isDockerSecret");
  });

  test("Compose builds and updates the versioned GHCR image", () => {
    expect(compose.match(/image: ghcr\.io\/flufox\/hermes-todo:\$\{HERMES_TODO_VERSION:-0\.1\.0\}/g)).toHaveLength(4);
    expect(compose).not.toMatch(/^\s*image: hermes-todo:/m);
  });

  test("Caddy keeps only the capability required to bind its listener ports", () => {
    const caddy = compose.slice(compose.indexOf("  caddy:"), compose.indexOf("  external-proxy:"));
    const externalProxy = compose.slice(compose.indexOf("  external-proxy:"), compose.indexOf("  calendar:"));
    expect(caddy).toContain("cap_add: [NET_BIND_SERVICE]");
    expect(externalProxy).toContain("cap_add: [NET_BIND_SERVICE]");
  });

  test("security actions use immutable commits and the remediated Trivy chain", () => {
    const actionRefs = [...securityWorkflow.matchAll(/uses:\s*[^\s@]+@([^\s#]+)/g)].map(
      (match) => match[1],
    );
    expect(actionRefs.length).toBeGreaterThan(0);
    expect(actionRefs.every((ref) => /^[a-f0-9]{40}$/.test(ref))).toBe(true);
    expect(securityWorkflow).toContain(
      "aquasecurity/trivy-action@ed142fd0673e97e23eac54620cfb913e5ce36c25",
    );
    expect(securityWorkflow).not.toContain("setup-trivy@v0.2.1");
  });

  test("Hermes installation uses Git URLs accepted by the 0.16 installer", () => {
    expect(cli).toContain("https://github.com/flufox/jnicq-hermes-todolist.git");
    expect(launcher).toContain("hermes plugins install https://github.com/flufox/jnicq-hermes-todolist.git --enable");
    expect(launcher).toContain("unset HERMES_TODO_API_URL HERMES_TODO_API_TOKEN");
    expect(launcher).toContain("hermes config set HERMES_TODO_API_TOKEN");
    expect(launcher).toContain("if ! hermes gateway restart; then");
    expect(launcher).not.toMatch(/export HERMES_TODO_API_(?:URL|TOKEN)/);
    expect(pluginManifest).toContain("name: HERMES_TODO_API_URL");
    expect(pluginManifest).toContain("name: HERMES_TODO_API_TOKEN");
    expect(pluginManifest).toMatch(/name: HERMES_TODO_API_TOKEN[\s\S]*?secret: true/);
    expect(cli).not.toContain('"plugins", "install", resolve(".")');
    expect(cli).not.toContain("hermes plugins install . --enable");
    expect(launcher).not.toContain("hermes plugins install . --enable");
    expect(ciWorkflow.match(/hermes plugins install \"file:\/\/\$GITHUB_WORKSPACE\" --enable/g)).toHaveLength(2);
    expect(ciWorkflow).not.toContain("todo.example.invalid/api/agent/v1");
    expect(ciWorkflow).not.toContain("cache: pip");
    expect(ciWorkflow).toContain("repository: NousResearch/hermes-agent");
    expect(ciWorkflow).toContain("python -m pip install -e ./.hermes-agent");
  });

  test("setup prepares private writable host directories before mounting them", () => {
    expect(launcher).toMatch(/setup\)\s+umask 077\s+mkdir -p data backups secrets\s+chmod 700 data backups secrets/m);
  });

  test("access logs redact OAuth and token query values", () => {
    expect(caddyfile).toContain("request>uri query");
    expect(caddyfile).toContain("replace code REDACTED");
    expect(caddyfile).toContain("replace state REDACTED");
    expect(caddyfile).toContain("replace token REDACTED");
  });
});
