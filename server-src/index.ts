import "dotenv/config";
import { chmodSync, existsSync, mkdirSync, realpathSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import rateLimit from "express-rate-limit";
import { createApp } from "./app.js";
import { isDockerSecretMountPath, loadConfig } from "./config.js";
import { DatabaseNotFoundError, openDatabase } from "./database.js";
import type { TelegramIdentity } from "./telegram-auth.js";

if (process.platform !== "win32") process.umask(0o077);

const config = loadConfig();
mkdirSync(dirname(config.databasePath), { recursive: true, mode: 0o700 });
mkdirSync(config.backupDirectory, { recursive: true, mode: 0o700 });
if (config.nodeEnv === "production") {
  if (!existsSync(config.masterKeyPath)) throw new Error("HERMES_TODO_MASTER_KEY_PATH does not exist");
  if (process.platform !== "win32") {
    for (const path of [config.masterKeyPath, dirname(config.databasePath), config.backupDirectory]) {
      const isMasterKey = path === config.masterKeyPath;
      if (!isMasterKey) chmodSync(path, 0o700);
      const isDockerSecret = isMasterKey && isDockerSecretMountPath(realpathSync(path));
      if ((statSync(path).mode & 0o077) !== 0 && !isDockerSecret) {
        throw new Error(`${path} must not be accessible by group or other users`);
      }
    }
  }
}
const database = openDatabase(config.databasePath);

let verifyIdentity: ((initData: string) => TelegramIdentity) | undefined;
if (config.demoAuth) {
  try {
    database.getWorkspace();
  } catch (error) {
    if (!(error instanceof DatabaseNotFoundError)) throw error;
    database.initializeWorkspace({ name: "Hermes Demo", locale: "en", timeZone: "UTC" });
    const demo = database.createMember({ telegramUserId: "999000", displayName: "Alex", role: "admin" });
    database.createTask(
      { type: "member", id: demo.id },
      {
        title: "Plan the weekend breakfast",
        note: "A clearly synthetic demo task",
        assigneeIds: [demo.id],
        tags: ["demo"],
        schedule: { type: "date", date: new Date().toISOString().slice(0, 10), timeZone: "UTC" },
      },
    );
  }
  verifyIdentity = () => ({ telegramUserId: "999000", displayName: "Alex", languageCode: "en" });
}

const api = createApp({
  database,
  config: {
    nodeEnv: config.nodeEnv,
    botToken: config.botToken,
    masterKeyPath: config.masterKeyPath,
    ...(config.publicUrl ? { publicUrl: config.publicUrl } : {}),
  },
  ...(verifyIdentity ? { verifyIdentity } : {}),
});

const app = express();
app.use(api);
const pageLimit = rateLimit({ windowMs: 60_000, limit: 240, standardHeaders: "draft-7", legacyHeaders: false });

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const distDirectory = join(currentDirectory, "..", "..", "dist");
if (existsSync(distDirectory)) {
  app.use(express.static(distDirectory, { index: false, maxAge: config.nodeEnv === "production" ? "1h" : 0 }));
  app.get("/{*splat}", pageLimit, (_request, response) => response.sendFile(join(distDirectory, "index.html")));
}

const server = app.listen(config.port, config.host, () => {
  console.log(`Hermes Todo listening on http://${config.host}:${config.port}`);
});

function shutdown(signal: string): void {
  console.log(`Received ${signal}; shutting down`);
  server.close(() => {
    database.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
