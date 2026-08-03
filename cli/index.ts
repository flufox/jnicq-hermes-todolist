#!/usr/bin/env node
import { randomBytes } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import Database from "better-sqlite3";
import { createPortableBackup, createSqliteSnapshot, restorePortableBackup } from "../server-src/backup.js";
import { openDatabase } from "../server-src/database.js";
import { validateSetupValues } from "./setup-values.js";

type Flags = Record<string, string | boolean>;

const HERMES_PLUGIN_REPOSITORY = "https://github.com/flufox/jnicq-hermes-todolist.git";

function parseFlags(args: string[]): Flags {
  const flags: Flags = {};
  for (let index = 0; index < args.length; index += 1) {
    const item = args[index];
    if (!item.startsWith("--")) continue;
    const [name, inline] = item.slice(2).split("=", 2);
    const next = args[index + 1];
    if (inline !== undefined) flags[name] = inline;
    else if (next && !next.startsWith("--")) {
      flags[name] = next;
      index += 1;
    } else flags[name] = true;
  }
  return flags;
}

function privateWrite(path: string, value: string | Buffer): void {
  mkdirSync(dirname(resolve(path)), { recursive: true, mode: 0o700 });
  writeFileSync(path, value, { mode: 0o600 });
  if (process.platform !== "win32") chmodSync(path, 0o600);
}

function run(command: string, args: string[], optional = false): string {
  const result = spawnSync(command, args, { encoding: "utf8", stdio: optional ? "pipe" : "inherit" });
  if (result.status !== 0 && !optional) throw new Error(`${command} ${args.join(" ")} failed`);
  return `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
}

async function promptSecret(label: string): Promise<string> {
  if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
    const reader = createInterface({ input: stdin, output: stdout });
    const value = await reader.question(`${label}: `);
    reader.close();
    return value.trim();
  }
  stdout.write(`${label}: `);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");
  return await new Promise<string>((resolveSecret, reject) => {
    let value = "";
    const finish = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener("data", onData);
      stdout.write("\n");
    };
    const onData = (chunk: string) => {
      if (chunk === "\r" || chunk === "\n") {
        finish();
        resolveSecret(value.trim());
      } else if (chunk === "\u0003") {
        finish();
        reject(new Error("Setup cancelled"));
      } else if (chunk === "\u007f" || chunk === "\b") value = value.slice(0, -1);
      else if (!chunk.startsWith("\u001b")) value += chunk;
    };
    stdin.on("data", onData);
  });
}

async function ask(reader: ReturnType<typeof createInterface>, label: string, fallback: string): Promise<string> {
  const answer = (await reader.question(`${label} [${fallback}]: `)).trim();
  return answer || fallback;
}

async function telegramCall<T>(token: string, method: string, body?: object): Promise<T> {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = (await response.json()) as { ok: boolean; result?: T; description?: string };
  if (!response.ok || !payload.ok || payload.result === undefined) {
    throw new Error(`Telegram ${method} failed: ${payload.description ?? response.status}`);
  }
  return payload.result;
}

async function setup(flags: Flags): Promise<void> {
  if (process.env.HERMES_TODO_SETUP_NO_START !== "1") run("docker", ["compose", "version"]);
  const reader = createInterface({ input: stdin, output: stdout });
  const domainAnswer = String(flags.domain || (await ask(reader, "Public domain", "todo.example.com")));
  const proxy = String(flags.proxy || (await ask(reader, "Proxy mode (caddy/external)", "caddy")));
  if (!new Set(["caddy", "external"]).has(proxy)) throw new Error("Proxy mode must be caddy or external");
  const acmeEmailAnswer = String(flags["acme-email"] || (await ask(reader, "ACME email", "admin@example.com")));
  const timeZoneAnswer = String(flags.timezone || (await ask(reader, "Workspace timezone", "UTC")));
  const localeAnswer = String(flags.language || (await ask(reader, "Default language (en/ru)", "en")));
  const homeNameAnswer = String(flags["home-name"] || (await ask(reader, "Workspace name", localeAnswer === "ru" ? "Моё пространство" : "My Workspace")));
  reader.close();
  const { domain, acmeEmail, timeZone, locale, homeName } = validateSetupValues({
    domain: domainAnswer,
    acmeEmail: acmeEmailAnswer,
    timeZone: timeZoneAnswer,
    locale: localeAnswer,
    homeName: homeNameAnswer,
  });
  const botToken = String(flags["bot-token"] || process.env.HERMES_TODO_TELEGRAM_BOT_TOKEN || (await promptSecret("Telegram bot token")));
  const bot = await telegramCall<{ username: string }>(botToken, "getMe");

  mkdirSync("data", { recursive: true, mode: 0o700 });
  mkdirSync("backups", { recursive: true, mode: 0o700 });
  mkdirSync("secrets", { recursive: true, mode: 0o700 });
  privateWrite("secrets/telegram_bot_token", `${botToken}\n`);
  if (!existsSync("secrets/master.key")) privateWrite("secrets/master.key", randomBytes(32));
  privateWrite(
    ".env",
    [
      "HERMES_TODO_VERSION=0.1.0",
      `HERMES_TODO_DOMAIN=${domain}`,
      `HERMES_TODO_PUBLIC_URL=https://${domain}`,
      `HERMES_TODO_PROXY_MODE=${proxy}`,
      `HERMES_TODO_ACME_EMAIL=${acmeEmail}`,
      `HERMES_TODO_TIMEZONE=${timeZone}`,
      `HERMES_TODO_LOCALE=${locale}`,
      `HERMES_TODO_HOME_NAME=${homeName}`,
      `COMPOSE_PROFILES=${proxy === "caddy" ? "caddy" : "external-proxy"}`,
      "",
    ].join("\n"),
  );

  const database = openDatabase("data/hermes-todo.sqlite");
  try {
    database.initializeWorkspace({ name: homeName, locale: locale as "en" | "ru", timeZone });
    const adminInvite = database.createInvite(
      { type: "system", id: "setup" },
      { role: "admin", expiresAt: new Date(Date.now() + 30 * 60_000).toISOString() },
    );
    const agentToken = database.createApiToken(
      { type: "system", id: "setup" },
      { label: "Hermes Agent", scopes: ["tasks:read", "tasks:write"] },
    );
    privateWrite("secrets/hermes_agent_token", `${agentToken.value}\n`);
    stdout.write(`\nAdmin invite (expires in 30 minutes): ${adminInvite.code}\n`);
  } finally {
    database.close();
  }

  await telegramCall(botToken, "setChatMenuButton", {
    menu_button: { type: "web_app", text: "Hermes Todo", web_app: { url: `https://${domain}` } },
  });
  stdout.write(`Telegram bot @${bot.username} is connected.\n`);

  if (process.env.HERMES_TODO_SETUP_NO_START !== "1") {
    run("docker", ["compose", "up", "-d", "--wait"]);
    const hermesVersion = run("hermes", ["--version"], true);
    if (/0\.16\./.test(hermesVersion)) {
      const consent = String(flags["enable-hermes"] || "").toLowerCase();
      if (consent === "yes" || consent === "true") {
        run("hermes", ["plugins", "install", HERMES_PLUGIN_REPOSITORY, "--enable"]);
      } else {
        stdout.write(`Hermes 0.16.x detected. Run \`hermes plugins install ${HERMES_PLUGIN_REPOSITORY} --enable\` when ready.\n`);
      }
    } else stdout.write("Hermes 0.16.x was not detected; Hermes itself was not installed.\n");
  }
}

async function doctor(): Promise<void> {
  const checks: Array<[string, boolean, string]> = [];
  const composeAvailable =
    process.env.HERMES_TODO_SETUP_NO_START === "1" || run("docker", ["compose", "version"], true).includes("Docker Compose");
  checks.push(["Docker Compose", composeAvailable, "install Docker Compose v2"]);
  for (const path of [".env", "secrets/master.key", "secrets/telegram_bot_token", "data/hermes-todo.sqlite"]) {
    checks.push([path, existsSync(path), "run ./hermes-todo setup"]);
    if (existsSync(path) && process.platform !== "win32" && path.startsWith("secrets/")) {
      checks.push([`${path} permissions`, (statSync(path).mode & 0o077) === 0, "chmod 600 the secret file"]);
    }
  }
  if (existsSync("data/hermes-todo.sqlite")) {
    const database = new Database("data/hermes-todo.sqlite", { readonly: true });
    checks.push(["SQLite integrity", database.pragma("integrity_check", { simple: true }) === "ok", "restore a known-good backup"]);
    database.close();
  }
  for (const [name, ok, repair] of checks) stdout.write(`${ok ? "OK" : "FAIL"}  ${name}${ok ? "" : ` — ${repair}`}\n`);
  if (checks.some(([, ok]) => !ok)) process.exitCode = 1;
}

async function backup(flags: Flags): Promise<void> {
  mkdirSync("backups", { recursive: true, mode: 0o700 });
  const timestamp = new Date().toISOString().replaceAll(":", "-");
  if (flags.portable) {
    const passphrase = String(flags.passphrase || process.env.HERMES_TODO_BACKUP_PASSPHRASE || (await promptSecret("Backup passphrase")));
    const archivePath = String(flags.output || `backups/hermes-todo-${timestamp}.htbackup`);
    await createPortableBackup({ databasePath: "data/hermes-todo.sqlite", masterKeyPath: "secrets/master.key", archivePath, passphrase });
    stdout.write(`${archivePath}\n`);
  } else {
    const snapshotPath = String(flags.output || `backups/hermes-todo-${timestamp}.sqlite`);
    await createSqliteSnapshot("data/hermes-todo.sqlite", snapshotPath);
    stdout.write(`${snapshotPath}\n`);
  }
}

async function restore(flags: Flags): Promise<void> {
  const archivePath = String(flags.archive || "");
  if (!archivePath) throw new Error("restore requires --archive PATH");
  const passphrase = String(flags.passphrase || process.env.HERMES_TODO_BACKUP_PASSPHRASE || (await promptSecret("Backup passphrase")));
  const result = await restorePortableBackup({
    archivePath,
    databasePath: "data/hermes-todo.sqlite",
    masterKeyPath: "secrets/master.key",
    passphrase,
    preRestoreSnapshotPath: `backups/pre-restore-${new Date().toISOString().replaceAll(":", "-")}.sqlite`,
  });
  stdout.write(`Restore complete; integrity=${result.integrity}; pre-restore=${result.preRestoreSnapshotPath ?? "none"}\n`);
}

function createInvite(role: "admin" | "member", minutes: number): void {
  const database = openDatabase("data/hermes-todo.sqlite");
  try {
    const invite = database.createInvite(
      { type: "system", id: "cli" },
      { role, expiresAt: new Date(Date.now() + minutes * 60_000).toISOString() },
    );
    stdout.write(`${invite.code}\n`);
  } finally {
    database.close();
  }
}

function rotateToken(): void {
  const database = openDatabase("data/hermes-todo.sqlite");
  try {
    for (const token of database.listApiTokens().filter((item) => item.label === "Hermes Agent" && !item.revokedAt)) {
      database.revokeApiToken(token.id, { type: "system", id: "cli" });
    }
    const token = database.createApiToken(
      { type: "system", id: "cli" },
      { label: "Hermes Agent", scopes: ["tasks:read", "tasks:write"] },
    );
    privateWrite("secrets/hermes_agent_token", `${token.value}\n`);
    stdout.write("Hermes Agent token rotated. Reinstall or reload the plugin configuration.\n");
  } finally {
    database.close();
  }
}

async function main(): Promise<void> {
  if (process.platform !== "win32") process.umask(0o077);
  const [command = "help", ...args] = process.argv.slice(2);
  const flags = parseFlags(args);
  if (command === "setup") await setup(flags);
  else if (command === "doctor") await doctor();
  else if (command === "backup") await backup(flags);
  else if (command === "restore") await restore(flags);
  else if (command === "invite-admin") createInvite("admin", Number(flags.minutes || 30));
  else if (command === "invite-member") createInvite("member", Number(flags.hours || 24) * 60);
  else if (command === "rotate-token") rotateToken();
  else if (command === "update") {
    await backup({});
    run("docker", ["compose", "pull"]);
    run("docker", ["compose", "up", "-d", "--wait", "--remove-orphans"]);
  } else {
    stdout.write("Usage: hermes-todo <setup|doctor|backup|restore|rotate-token|invite-admin|invite-member|update> [options]\n");
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  process.stderr.write(`Hermes Todo: ${message.replaceAll(/\d{6,}:[A-Za-z0-9_-]{20,}/g, "[redacted]")}\n`);
  process.exitCode = 1;
});
