import { readFileSync, realpathSync, statSync } from "node:fs";
import { posix, resolve } from "node:path";

export type RuntimeConfig = {
  nodeEnv: "development" | "test" | "production";
  host: string;
  port: number;
  databasePath: string;
  backupDirectory: string;
  masterKeyPath: string;
  botToken: string;
  publicUrl?: string;
  demoAuth: boolean;
};

function parsePort(value: string | undefined): number {
  const port = Number(value ?? "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error("HERMES_TODO_PORT must be a valid TCP port");
  return port;
}

function isLoopback(host: string): boolean {
  return host === "127.0.0.1" || host === "::1" || host === "localhost";
}

export function isDockerSecretMountPath(path: string, platform = process.platform): boolean {
  if (platform !== "linux") return false;
  const resolvedPath = posix.resolve(path);
  return resolvedPath.startsWith("/run/secrets/");
}

function readSecret(environment: Record<string, string | undefined>, valueName: string, fileName: string): string {
  const direct = environment[valueName]?.trim();
  if (direct) return direct;
  const path = environment[fileName]?.trim();
  if (!path) return "";
  if (process.platform !== "win32" && (statSync(path).mode & 0o077) !== 0) {
    const canonicalPath = realpathSync(path);
    if (!isDockerSecretMountPath(canonicalPath)) {
      throw new Error(`${fileName} must point to a file that is not readable by group or other users`);
    }
  }
  return readFileSync(path, "utf8").trim();
}

export function loadConfig(environment: Record<string, string | undefined> = process.env): RuntimeConfig {
  const nodeEnv = (environment.NODE_ENV ?? "production") as RuntimeConfig["nodeEnv"];
  if (!(["development", "test", "production"] as const).includes(nodeEnv)) {
    throw new Error("NODE_ENV must be development, test, or production");
  }
  const host = environment.HERMES_TODO_HOST?.trim() || "127.0.0.1";
  const demoAuth = environment.HERMES_TODO_DEMO_AUTH === "true";
  if (demoAuth && nodeEnv !== "development") {
    throw new Error("Demo authentication is only available in development");
  }
  if (demoAuth && !isLoopback(host)) {
    throw new Error("Demo authentication requires a loopback host");
  }
  const publicUrl = environment.HERMES_TODO_PUBLIC_URL?.trim();
  const botToken = readSecret(
    environment,
    "HERMES_TODO_TELEGRAM_BOT_TOKEN",
    "HERMES_TODO_TELEGRAM_BOT_TOKEN_FILE",
  );
  if (nodeEnv === "production") {
    if (!botToken) throw new Error("HERMES_TODO_TELEGRAM_BOT_TOKEN is required in production");
    if (!publicUrl || new URL(publicUrl).protocol !== "https:") {
      throw new Error("HERMES_TODO_PUBLIC_URL must be an HTTPS URL in production");
    }
  }
  return {
    nodeEnv,
    host,
    port: parsePort(environment.HERMES_TODO_PORT),
    databasePath: resolve(environment.HERMES_TODO_DATABASE_PATH ?? "data/hermes-todo.sqlite"),
    backupDirectory: resolve(environment.HERMES_TODO_BACKUP_DIRECTORY ?? "backups"),
    masterKeyPath: resolve(environment.HERMES_TODO_MASTER_KEY_PATH ?? "secrets/master.key"),
    botToken,
    ...(publicUrl ? { publicUrl } : {}),
    demoAuth,
  };
}
