import { createCipheriv, createDecipheriv, randomBytes, randomUUID, scryptSync } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";

interface PortableEnvelope {
  version: 1;
  algorithm: "aes-256-gcm";
  kdf: "scrypt";
  salt: string;
  iv: string;
  tag: string;
  ciphertext: string;
}

interface PortablePayload {
  createdAt: string;
  database: string;
  masterKey: string;
}

export function backupCalendarSlot(now: Date, timeZone: string): { date: string; weekly: boolean } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    })
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, weekly: parts.weekday === "Sun" };
}

function secureWrite(path: string, value: string | Buffer): void {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writeFileSync(path, value, { mode: 0o600 });
  if (process.platform !== "win32") chmodSync(path, 0o600);
}

export async function createSqliteSnapshot(databasePath: string, snapshotPath: string): Promise<void> {
  mkdirSync(dirname(snapshotPath), { recursive: true, mode: 0o700 });
  const source = new Database(databasePath, { readonly: true, fileMustExist: true });
  try {
    await source.backup(snapshotPath);
    const snapshot = new Database(snapshotPath, { readonly: true, fileMustExist: true });
    const integrity = snapshot.pragma("integrity_check", { simple: true });
    snapshot.close();
    if (integrity !== "ok") throw new Error(`SQLite integrity check failed: ${String(integrity)}`);
    if (process.platform !== "win32") chmodSync(snapshotPath, 0o600);
  } finally {
    source.close();
  }
}

export async function createPortableBackup(options: {
  databasePath: string;
  masterKeyPath: string;
  archivePath: string;
  passphrase: string;
}): Promise<void> {
  if (options.passphrase.length < 12) throw new Error("Backup passphrase must contain at least 12 characters");
  const snapshotPath = `${options.archivePath}.snapshot-${randomUUID()}.db`;
  try {
    await createSqliteSnapshot(options.databasePath, snapshotPath);
    const payload: PortablePayload = {
      createdAt: new Date().toISOString(),
      database: readFileSync(snapshotPath).toString("base64"),
      masterKey: readFileSync(options.masterKeyPath).toString("base64"),
    };
    const salt = randomBytes(16);
    const iv = randomBytes(12);
    const key = scryptSync(options.passphrase, salt, 32);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
    const envelope: PortableEnvelope = {
      version: 1,
      algorithm: "aes-256-gcm",
      kdf: "scrypt",
      salt: salt.toString("base64"),
      iv: iv.toString("base64"),
      tag: cipher.getAuthTag().toString("base64"),
      ciphertext: ciphertext.toString("base64"),
    };
    secureWrite(options.archivePath, `${JSON.stringify(envelope)}\n`);
  } finally {
    rmSync(snapshotPath, { force: true });
  }
}

function decryptArchive(archivePath: string, passphrase: string): PortablePayload {
  try {
    const envelope = JSON.parse(readFileSync(archivePath, "utf8")) as PortableEnvelope;
    if (envelope.version !== 1 || envelope.algorithm !== "aes-256-gcm" || envelope.kdf !== "scrypt") {
      throw new Error("Unsupported portable backup format");
    }
    const key = scryptSync(passphrase, Buffer.from(envelope.salt, "base64"), 32);
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(envelope.iv, "base64"));
    decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8");
    const payload = JSON.parse(plaintext) as PortablePayload;
    if (!payload.database || !payload.masterKey || !payload.createdAt) throw new Error("Incomplete backup payload");
    return payload;
  } catch (error) {
    throw new Error("Portable backup could not be decrypted or is corrupted", { cause: error });
  }
}

export async function restorePortableBackup(options: {
  archivePath: string;
  databasePath: string;
  masterKeyPath: string;
  passphrase: string;
  preRestoreSnapshotPath?: string;
}): Promise<{ integrity: "ok"; preRestoreSnapshotPath?: string }> {
  const payload = decryptArchive(options.archivePath, options.passphrase);
  const candidatePath = `${options.databasePath}.restore-${randomUUID()}.db`;
  let preRestoreSnapshotPath: string | undefined;
  try {
    secureWrite(candidatePath, Buffer.from(payload.database, "base64"));
    const candidate = new Database(candidatePath, { readonly: true, fileMustExist: true });
    const integrity = candidate.pragma("integrity_check", { simple: true });
    candidate.close();
    if (integrity !== "ok") throw new Error(`SQLite integrity check failed: ${String(integrity)}`);

    if (existsSync(options.databasePath)) {
      preRestoreSnapshotPath =
        options.preRestoreSnapshotPath ?? `${options.databasePath}.pre-restore-${new Date().toISOString().replaceAll(":", "-")}.db`;
      await createSqliteSnapshot(options.databasePath, preRestoreSnapshotPath);
    }
    mkdirSync(dirname(options.databasePath), { recursive: true, mode: 0o700 });
    copyFileSync(candidatePath, options.databasePath);
    secureWrite(options.masterKeyPath, Buffer.from(payload.masterKey, "base64"));
    if (process.platform !== "win32") chmodSync(options.databasePath, 0o600);
    return { integrity: "ok", ...(preRestoreSnapshotPath ? { preRestoreSnapshotPath } : {}) };
  } finally {
    rmSync(candidatePath, { force: true });
  }
}
