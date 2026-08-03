import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { readFileSync, statSync } from "node:fs";

type JsonObject = Record<string, unknown>;

interface EncryptedEnvelope {
  version: 1;
  algorithm: "aes-256-gcm";
  iv: string;
  tag: string;
  ciphertext: string;
}

function loadMasterKey(path: string): Buffer {
  if (process.platform !== "win32" && (statSync(path).mode & 0o077) !== 0) {
    throw new Error("Google master key permissions must be 0600 or stricter");
  }
  const key = readFileSync(path);
  if (key.length !== 32) throw new Error("Google master key must contain exactly 32 random bytes");
  return key;
}

export function encryptGoogleConfig(value: JsonObject, masterKeyPath: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", loadMasterKey(masterKeyPath), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  const envelope: EncryptedEnvelope = {
    version: 1,
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
  return JSON.stringify(envelope);
}

export function decryptGoogleConfig<T extends JsonObject = JsonObject>(value: string, masterKeyPath: string): T {
  try {
    const envelope = JSON.parse(value) as EncryptedEnvelope;
    if (envelope.version !== 1 || envelope.algorithm !== "aes-256-gcm") throw new Error("Unsupported envelope");
    const decipher = createDecipheriv("aes-256-gcm", loadMasterKey(masterKeyPath), Buffer.from(envelope.iv, "base64"));
    decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
    return JSON.parse(
      Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, "base64")), decipher.final()]).toString("utf8"),
    ) as T;
  } catch (error) {
    throw new Error("Google OAuth configuration could not be decrypted", { cause: error });
  }
}

export function createGooglePkce(): { state: string; verifier: string; challenge: string } {
  const state = randomBytes(24).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier, "ascii").digest("base64url");
  return { state, verifier, challenge };
}

export function buildGoogleAuthorizationUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
  challenge: string;
}): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: "https://www.googleapis.com/auth/calendar.app.created",
    state: input.state,
    code_challenge: input.challenge,
    code_challenge_method: "S256",
  }).toString();
  return url.toString();
}

export function normalizeGoogleText(value: string, maximumLength: number): string {
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maximumLength);
}

export function resolveGoogleConflict(input: {
  taskVersion: number;
  syncedTaskVersion: number;
  googleChanged: boolean;
}): "synced" | "task" | "google" | "needs_attention" {
  const taskChanged = input.taskVersion !== input.syncedTaskVersion;
  if (taskChanged && input.googleChanged) return "needs_attention";
  if (input.googleChanged) return "google";
  if (taskChanged) return "task";
  return "synced";
}
