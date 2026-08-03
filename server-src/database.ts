import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { chmodSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import type {
  Actor,
  ApiScope,
  AdminMember,
  Locale,
  Member,
  MemberRole,
  Schedule,
  Task,
  TaskCreateInput,
  TaskStatus,
  TaskUpdateInput,
  Workspace,
} from "../shared/contracts.js";

type SqliteDatabase = InstanceType<typeof Database>;
type TaskRow = {
  id: string;
  title: string;
  note: string | null;
  status: TaskStatus;
  schedule_type: "date" | "time" | null;
  due_date: string | null;
  start_at: string | null;
  end_at: string | null;
  time_zone: string | null;
  version: number;
  created_by_type: Actor["type"];
  created_by_id: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  archived_at: string | null;
};

export class DatabaseValidationError extends Error {}
export class DatabaseNotFoundError extends Error {}
export class DatabaseConflictError extends Error {}

const CORE_MIGRATION = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 80),
  locale TEXT NOT NULL CHECK(locale IN ('en', 'ru')),
  time_zone TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  telegram_user_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL CHECK(length(display_name) BETWEEN 1 AND 80),
  role TEXT NOT NULL CHECK(role IN ('admin', 'member')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'disabled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 160),
  note TEXT CHECK(note IS NULL OR length(note) <= 1000),
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'completed', 'archived')),
  schedule_type TEXT CHECK(schedule_type IS NULL OR schedule_type IN ('date', 'time')),
  due_date TEXT,
  start_at TEXT,
  end_at TEXT,
  time_zone TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK(version >= 1),
  created_by_type TEXT NOT NULL CHECK(created_by_type IN ('member', 'integration', 'system')),
  created_by_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  archived_at TEXT,
  CHECK(
    (schedule_type IS NULL AND due_date IS NULL AND start_at IS NULL AND end_at IS NULL) OR
    (schedule_type = 'date' AND due_date IS NOT NULL AND start_at IS NULL AND end_at IS NULL AND time_zone IS NOT NULL) OR
    (schedule_type = 'time' AND due_date IS NULL AND start_at IS NOT NULL AND end_at IS NOT NULL AND time_zone IS NOT NULL)
  )
);
CREATE TABLE IF NOT EXISTS task_assignees (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
  ordinal INTEGER NOT NULL,
  PRIMARY KEY(task_id, member_id)
);
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 32),
  normalized_name TEXT NOT NULL,
  UNIQUE(workspace_id, normalized_name)
);
CREATE TABLE IF NOT EXISTS task_tags (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  ordinal INTEGER NOT NULL,
  PRIMARY KEY(task_id, tag_id)
);
CREATE INDEX IF NOT EXISTS tasks_workspace_status_idx ON tasks(workspace_id, status, updated_at);
CREATE INDEX IF NOT EXISTS task_assignees_member_idx ON task_assignees(member_id, task_id);
`;

const ACCESS_MIGRATION = `
CREATE TABLE IF NOT EXISTS invites (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK(role IN ('admin', 'member')),
  expires_at TEXT NOT NULL,
  used_at TEXT,
  revoked_at TEXT,
  created_by_type TEXT NOT NULL CHECK(created_by_type IN ('member', 'integration', 'system')),
  created_by_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS api_tokens (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  label TEXT NOT NULL CHECK(length(label) BETWEEN 1 AND 80),
  token_hash TEXT NOT NULL UNIQUE,
  scopes TEXT NOT NULL,
  revoked_at TEXT,
  last_used_at TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  actor_type TEXT NOT NULL CHECK(actor_type IN ('member', 'integration', 'system')),
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS invites_hash_idx ON invites(token_hash);
CREATE INDEX IF NOT EXISTS api_tokens_hash_idx ON api_tokens(token_hash);
CREATE INDEX IF NOT EXISTS audit_created_idx ON audit_events(created_at);
`;

const GOOGLE_MIGRATION = `
CREATE TABLE IF NOT EXISTS google_connections (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
  account_email TEXT,
  calendar_id TEXT,
  encrypted_config TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending', 'active', 'needs_attention', 'disconnected')),
  connected_at TEXT,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS google_task_links (
  task_id TEXT PRIMARY KEY REFERENCES tasks(id) ON DELETE CASCADE,
  google_event_id TEXT NOT NULL UNIQUE,
  etag TEXT,
  google_updated_at TEXT,
  task_version INTEGER NOT NULL,
  sync_status TEXT NOT NULL CHECK(sync_status IN ('synced', 'needs_attention')),
  last_error TEXT,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS google_links_status_idx ON google_task_links(sync_status, updated_at);
`;

const now = (): string => new Date().toISOString();
const SCRYPT_OPTIONS = { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;

function hashSecret(value: string): string {
  const salt = randomBytes(16);
  const digest = scryptSync(value, salt, 32, SCRYPT_OPTIONS);
  return `scrypt-v1$${salt.toString("base64url")}$${digest.toString("base64url")}`;
}

function verifySecret(value: string, encoded: string): boolean {
  const [scheme, saltValue, digestValue] = encoded.split("$");
  if (scheme !== "scrypt-v1" || !saltValue || !digestValue) return false;
  try {
    const salt = Buffer.from(saltValue, "base64url");
    const expected = Buffer.from(digestValue, "base64url");
    if (salt.length !== 16 || expected.length !== 32) return false;
    const actual = scryptSync(value, salt, expected.length, SCRYPT_OPTIONS);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function normalizeTitle(value: string): string {
  const title = value.trim();
  if (!title || title.length > 160) {
    throw new DatabaseValidationError("Task title must contain between 1 and 160 characters");
  }
  return title;
}

function normalizeNote(value: string | undefined): string | null {
  if (value === undefined) return null;
  const note = value.trim();
  if (note.length > 1000) throw new DatabaseValidationError("Task note cannot exceed 1000 characters");
  return note || null;
}

function normalizeTags(values: string[]): string[] {
  const tags: string[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    const tag = raw.trim();
    const normalized = tag.toLocaleLowerCase("en-US");
    if (!tag || tag.length > 32 || seen.has(normalized)) continue;
    seen.add(normalized);
    tags.push(tag);
    if (tags.length > 8) throw new DatabaseValidationError("A task can have at most 8 tags");
  }
  return tags;
}

function normalizeSchedule(schedule: Schedule): Schedule {
  if (schedule === null) return null;
  if (!schedule.timeZone.trim()) throw new DatabaseValidationError("A schedule requires an IANA time zone");
  if (schedule.type === "date") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(schedule.date)) {
      throw new DatabaseValidationError("A date schedule must use YYYY-MM-DD");
    }
    return { ...schedule, timeZone: schedule.timeZone.trim() };
  }
  const start = Date.parse(schedule.startAt);
  const end = Date.parse(schedule.endAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
    throw new DatabaseValidationError("A timed schedule requires valid startAt before endAt");
  }
  return { ...schedule, timeZone: schedule.timeZone.trim() };
}

export class HermesTodoDatabase {
  readonly sqlite: SqliteDatabase;

  constructor(sqlite: SqliteDatabase) {
    this.sqlite = sqlite;
    this.sqlite.pragma("foreign_keys = ON");
    this.sqlite.pragma("busy_timeout = 5000");
    this.migrate();
  }

  migrate(): void {
    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      )
    `);
    const applied = new Set(
      (this.sqlite.prepare("SELECT version FROM schema_migrations").all() as Array<{ version: number }>).map(
        ({ version }) => version,
      ),
    );
    const apply = this.sqlite.transaction((version: number, sql: string) => {
      this.sqlite.exec(sql);
      this.sqlite.prepare("INSERT INTO schema_migrations(version, applied_at) VALUES(?, ?)").run(version, now());
    });
    for (const [version, sql] of [
      [1, CORE_MIGRATION],
      [2, ACCESS_MIGRATION],
      [3, GOOGLE_MIGRATION],
    ] as const) {
      if (!applied.has(version)) apply(version, sql);
    }
  }

  close(): void {
    this.sqlite.close();
  }

  initializeWorkspace(input: { name: string; locale: Locale; timeZone: string }): Workspace {
    const existing = this.getWorkspaceOrUndefined();
    if (existing) return existing;
    const timestamp = now();
    const workspace: Workspace = {
      id: randomUUID(),
      name: input.name.trim(),
      locale: input.locale,
      timeZone: input.timeZone.trim(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    if (!workspace.name || !workspace.timeZone) {
      throw new DatabaseValidationError("Workspace name and time zone are required");
    }
    this.sqlite
      .prepare("INSERT INTO workspaces(id, name, locale, time_zone, created_at, updated_at) VALUES(?, ?, ?, ?, ?, ?)")
      .run(workspace.id, workspace.name, workspace.locale, workspace.timeZone, timestamp, timestamp);
    return workspace;
  }

  getWorkspace(): Workspace {
    const workspace = this.getWorkspaceOrUndefined();
    if (!workspace) throw new DatabaseNotFoundError("Workspace is not initialized");
    return workspace;
  }

  getRevision(): number {
    const row = this.sqlite.prepare("SELECT revision FROM workspaces LIMIT 1").get() as { revision: number } | undefined;
    return row?.revision ?? 0;
  }

  createMember(input: { telegramUserId: string; displayName: string; role: MemberRole }): AdminMember {
    const workspace = this.getWorkspace();
    const timestamp = now();
    const member: AdminMember = {
      id: randomUUID(),
      telegramUserId: input.telegramUserId.trim(),
      displayName: input.displayName.trim(),
      role: input.role,
      status: "active",
      createdAt: timestamp,
    };
    if (!/^\d+$/.test(member.telegramUserId) || !member.displayName || member.displayName.length > 80) {
      throw new DatabaseValidationError("A member requires a numeric Telegram ID and display name");
    }
    this.sqlite
      .prepare(
        "INSERT INTO members(id, workspace_id, telegram_user_id, display_name, role, status, created_at, updated_at) VALUES(?, ?, ?, ?, ?, 'active', ?, ?)",
      )
      .run(member.id, workspace.id, member.telegramUserId, member.displayName, member.role, timestamp, timestamp);
    this.bumpRevision();
    return member;
  }

  getMember(id: string): AdminMember | undefined {
    const row = this.sqlite
      .prepare("SELECT id, telegram_user_id, display_name, role, status, created_at FROM members WHERE id = ?")
      .get(id) as
      | {
          id: string;
          telegram_user_id: string;
          display_name: string;
          role: MemberRole;
          status: "active" | "disabled";
          created_at: string;
        }
      | undefined;
    return row
      ? {
          id: row.id,
          telegramUserId: row.telegram_user_id,
          displayName: row.display_name,
          role: row.role,
          status: row.status,
          createdAt: row.created_at,
        }
      : undefined;
  }

  getMemberByTelegramId(telegramUserId: string): AdminMember | undefined {
    const row = this.sqlite.prepare("SELECT id FROM members WHERE telegram_user_id = ?").get(telegramUserId) as
      | { id: string }
      | undefined;
    return row ? this.getMember(row.id) : undefined;
  }

  listMembers(): Member[] {
    return (this.sqlite.prepare("SELECT id FROM members WHERE status = 'active' ORDER BY created_at, id").all() as Array<{ id: string }>).map(
      ({ id }) => {
        const member = this.getMember(id)!;
        const { telegramUserId: _privateId, ...safeMember } = member;
        return safeMember;
      },
    );
  }

  listAdminMembers(): AdminMember[] {
    return (this.sqlite.prepare("SELECT id FROM members ORDER BY created_at, id").all() as Array<{ id: string }>).map(
      ({ id }) => this.getMember(id)!,
    );
  }

  setMemberStatus(id: string, status: "active" | "disabled", actor: Actor): AdminMember {
    const member = this.getMember(id);
    if (!member) throw new DatabaseNotFoundError("Member not found");
    if (status === "disabled" && member.role === "admin" && member.status === "active") {
      const { count } = this.sqlite
        .prepare("SELECT COUNT(*) AS count FROM members WHERE role = 'admin' AND status = 'active'")
        .get() as { count: number };
      if (count <= 1) throw new DatabaseConflictError("The last active administrator cannot be disabled");
    }
    this.sqlite.prepare("UPDATE members SET status = ? WHERE id = ?").run(status, id);
    this.bumpRevision();
    this.recordAudit(actor, "member.status_changed", "member", id);
    return this.getMember(id)!;
  }

  createInvite(
    actor: Actor,
    input: { role: MemberRole; expiresAt: string },
  ): { id: string; code: string; role: MemberRole; expiresAt: string } {
    const expiresAt = new Date(input.expiresAt);
    if (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
      throw new DatabaseValidationError("Invite expiry must be in the future");
    }
    const workspace = this.getWorkspace();
    const id = randomUUID();
    const code = randomBytes(12).toString("base64url").toUpperCase();
    this.sqlite
      .prepare(
        `INSERT INTO invites(
          id, workspace_id, token_hash, role, expires_at, created_by_type, created_by_id, created_at
        ) VALUES(?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(id, workspace.id, hashSecret(code), input.role, expiresAt.toISOString(), actor.type, actor.id, now());
    this.recordAudit(actor, "invite.created", "invite", id);
    return { id, code, role: input.role, expiresAt: expiresAt.toISOString() };
  }

  claimInvite(
    code: string,
    identity: { telegramUserId: string; displayName: string },
  ): AdminMember {
    return this.sqlite.transaction(() => {
      const normalizedCode = code.trim().toUpperCase();
      const invite = (this.sqlite
        .prepare("SELECT id, token_hash, role, expires_at, used_at, revoked_at FROM invites")
        .all() as Array<{
          id: string;
          token_hash: string;
          role: MemberRole;
          expires_at: string;
          used_at: string | null;
          revoked_at: string | null;
        }>).find(({ token_hash }) => verifySecret(normalizedCode, token_hash));
      if (!invite) throw new DatabaseValidationError("Invalid invite code");
      if (invite.revoked_at) throw new DatabaseValidationError("Invite has been revoked");
      if (invite.used_at) throw new DatabaseConflictError("Invite has already been used");
      if (Date.parse(invite.expires_at) <= Date.now()) throw new DatabaseValidationError("Invite has expired");
      if (this.getMemberByTelegramId(identity.telegramUserId)) {
        throw new DatabaseConflictError("Telegram user is already a member");
      }
      const member = this.createMember({
        telegramUserId: identity.telegramUserId,
        displayName: identity.displayName,
        role: invite.role,
      });
      this.sqlite.prepare("UPDATE invites SET used_at = ? WHERE id = ? AND used_at IS NULL").run(now(), invite.id);
      this.recordAudit({ type: "member", id: member.id }, "invite.claimed", "invite", invite.id);
      return member;
    })();
  }

  revokeInvite(id: string, actor: Actor): void {
    this.sqlite.prepare("UPDATE invites SET revoked_at = ? WHERE id = ? AND used_at IS NULL").run(now(), id);
    this.recordAudit(actor, "invite.revoked", "invite", id);
  }

  listInvites(): Array<{ id: string; role: MemberRole; expiresAt: string; usedAt?: string; revokedAt?: string; createdAt: string }> {
    return (this.sqlite
      .prepare("SELECT id, role, expires_at, used_at, revoked_at, created_at FROM invites ORDER BY created_at DESC")
      .all() as Array<{
      id: string;
      role: MemberRole;
      expires_at: string;
      used_at: string | null;
      revoked_at: string | null;
      created_at: string;
    }>).map((row) => ({
      id: row.id,
      role: row.role,
      expiresAt: row.expires_at,
      ...(row.used_at ? { usedAt: row.used_at } : {}),
      ...(row.revoked_at ? { revokedAt: row.revoked_at } : {}),
      createdAt: row.created_at,
    }));
  }

  createApiToken(
    actor: Actor,
    input: { label: string; scopes: ApiScope[] },
  ): { id: string; label: string; scopes: ApiScope[]; value: string } {
    const label = input.label.trim();
    const scopes = [...new Set(input.scopes)];
    if (!label || label.length > 80 || scopes.length === 0) {
      throw new DatabaseValidationError("An API token requires a label and at least one scope");
    }
    const workspace = this.getWorkspace();
    const id = randomUUID();
    const value = `ht_${randomBytes(32).toString("base64url")}`;
    this.sqlite
      .prepare(
        "INSERT INTO api_tokens(id, workspace_id, label, token_hash, scopes, created_at) VALUES(?, ?, ?, ?, ?, ?)",
      )
      .run(id, workspace.id, label, hashSecret(value), JSON.stringify(scopes), now());
    this.recordAudit(actor, "token.created", "api_token", id);
    return { id, label, scopes, value };
  }

  authenticateApiToken(
    value: string,
    requiredScope: ApiScope,
  ): { id: string; label: string; scopes: ApiScope[] } | undefined {
    const row = (this.sqlite
      .prepare("SELECT id, label, scopes, token_hash FROM api_tokens WHERE revoked_at IS NULL")
      .all() as Array<{ id: string; label: string; scopes: string; token_hash: string }>).find(
        ({ token_hash }) => verifySecret(value, token_hash),
      );
    if (!row) return undefined;
    const scopes = JSON.parse(row.scopes) as ApiScope[];
    if (!scopes.includes(requiredScope)) return undefined;
    this.sqlite.prepare("UPDATE api_tokens SET last_used_at = ? WHERE id = ?").run(now(), row.id);
    return { id: row.id, label: row.label, scopes };
  }

  revokeApiToken(id: string, actor: Actor): void {
    this.sqlite.prepare("UPDATE api_tokens SET revoked_at = ? WHERE id = ?").run(now(), id);
    this.recordAudit(actor, "token.revoked", "api_token", id);
  }

  listApiTokens(): Array<{ id: string; label: string; scopes: ApiScope[]; createdAt: string; revokedAt?: string }> {
    return (this.sqlite
      .prepare("SELECT id, label, scopes, created_at, revoked_at FROM api_tokens ORDER BY created_at DESC")
      .all() as Array<{ id: string; label: string; scopes: string; created_at: string; revoked_at: string | null }>).map(
      (row) => ({
        id: row.id,
        label: row.label,
        scopes: JSON.parse(row.scopes) as ApiScope[],
        createdAt: row.created_at,
        ...(row.revoked_at ? { revokedAt: row.revoked_at } : {}),
      }),
    );
  }

  saveGoogleConnection(input: {
    encryptedConfig: string;
    status: "pending" | "active" | "needs_attention" | "disconnected";
    accountEmail?: string;
    calendarId?: string;
  }): string {
    const workspace = this.getWorkspace();
    const existing = this.sqlite
      .prepare("SELECT id FROM google_connections WHERE workspace_id = ?")
      .get(workspace.id) as { id: string } | undefined;
    const id = existing?.id ?? randomUUID();
    this.sqlite
      .prepare(
        `INSERT INTO google_connections(
          id, workspace_id, account_email, calendar_id, encrypted_config, status, connected_at, updated_at
        ) VALUES(?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(workspace_id) DO UPDATE SET
          account_email = excluded.account_email,
          calendar_id = excluded.calendar_id,
          encrypted_config = excluded.encrypted_config,
          status = excluded.status,
          connected_at = CASE WHEN excluded.status = 'active' THEN excluded.connected_at ELSE google_connections.connected_at END,
          updated_at = excluded.updated_at`,
      )
      .run(
        id,
        workspace.id,
        input.accountEmail ?? null,
        input.calendarId ?? null,
        input.encryptedConfig,
        input.status,
        input.status === "active" ? now() : null,
        now(),
      );
    return id;
  }

  getGoogleConnection():
    | { id: string; accountEmail?: string; calendarId?: string; encryptedConfig: string; status: "pending" | "active" | "needs_attention" | "disconnected"; updatedAt: string }
    | undefined {
    const workspace = this.getWorkspace();
    const row = this.sqlite
      .prepare(
        "SELECT id, account_email, calendar_id, encrypted_config, status, updated_at FROM google_connections WHERE workspace_id = ?",
      )
      .get(workspace.id) as
      | {
          id: string;
          account_email: string | null;
          calendar_id: string | null;
          encrypted_config: string;
          status: "pending" | "active" | "needs_attention" | "disconnected";
          updated_at: string;
        }
      | undefined;
    return row
      ? {
          id: row.id,
          ...(row.account_email ? { accountEmail: row.account_email } : {}),
          ...(row.calendar_id ? { calendarId: row.calendar_id } : {}),
          encryptedConfig: row.encrypted_config,
          status: row.status,
          updatedAt: row.updated_at,
        }
      : undefined;
  }

  removeGoogleConnection(actor: Actor): void {
    const connection = this.getGoogleConnection();
    if (!connection) return;
    this.sqlite.prepare("DELETE FROM google_connections WHERE id = ?").run(connection.id);
    this.recordAudit(actor, "google.disconnected", "google_connection", connection.id);
  }

  createTask(actor: Actor, input: TaskCreateInput): Task {
    return this.sqlite.transaction(() => {
      const workspace = this.getWorkspace();
      const timestamp = now();
      const taskId = randomUUID();
      const schedule = normalizeSchedule(input.schedule);
      const title = normalizeTitle(input.title);
      const note = normalizeNote(input.note);
      const tags = normalizeTags(input.tags);
      this.assertMembers(input.assigneeIds);
      this.sqlite
        .prepare(
          `INSERT INTO tasks(
             id, workspace_id, title, note, status, schedule_type, due_date, start_at, end_at, time_zone,
             version, created_by_type, created_by_id, created_at, updated_at
           ) VALUES(?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
        )
        .run(
          taskId,
          workspace.id,
          title,
          note,
          schedule?.type ?? null,
          schedule?.type === "date" ? schedule.date : null,
          schedule?.type === "time" ? schedule.startAt : null,
          schedule?.type === "time" ? schedule.endAt : null,
          schedule?.timeZone ?? null,
          actor.type,
          actor.id,
          timestamp,
          timestamp,
        );
      this.replaceAssignees(taskId, input.assigneeIds);
      this.replaceTags(taskId, tags);
      this.bumpRevision();
      return this.getTask(taskId)!;
    })();
  }

  updateTask(id: string, expectedVersion: number, actor: Actor, patch: TaskUpdateInput): Task {
    return this.sqlite.transaction(() => {
      const current = this.getTask(id);
      if (!current) throw new DatabaseNotFoundError("Task not found");
      if (current.version !== expectedVersion) throw new DatabaseConflictError("Task version conflict");
      const title = patch.title === undefined ? current.title : normalizeTitle(patch.title);
      const note = patch.note === undefined ? current.note ?? null : normalizeNote(patch.note);
      const schedule = patch.schedule === undefined ? current.schedule : normalizeSchedule(patch.schedule);
      const assigneeIds = patch.assigneeIds ?? current.assigneeIds;
      const tags = patch.tags === undefined ? current.tags : normalizeTags(patch.tags);
      this.assertMembers(assigneeIds);
      const result = this.sqlite
        .prepare(
          `UPDATE tasks SET title = ?, note = ?, schedule_type = ?, due_date = ?, start_at = ?, end_at = ?, time_zone = ?,
           version = version + 1, updated_at = ? WHERE id = ? AND version = ?`,
        )
        .run(
          title,
          note,
          schedule?.type ?? null,
          schedule?.type === "date" ? schedule.date : null,
          schedule?.type === "time" ? schedule.startAt : null,
          schedule?.type === "time" ? schedule.endAt : null,
          schedule?.timeZone ?? null,
          now(),
          id,
          expectedVersion,
        );
      if (result.changes !== 1) throw new DatabaseConflictError("Task version conflict");
      this.replaceAssignees(id, assigneeIds);
      this.replaceTags(id, tags);
      this.recordAudit(actor, "task.updated", "task", id);
      this.bumpRevision();
      return this.getTask(id)!;
    })();
  }

  setTaskStatus(id: string, expectedVersion: number, status: TaskStatus, actor: Actor): Task {
    const current = this.getTask(id);
    if (!current) throw new DatabaseNotFoundError("Task not found");
    if (current.version !== expectedVersion) throw new DatabaseConflictError("Task version conflict");
    const timestamp = now();
    const result = this.sqlite
      .prepare(
        "UPDATE tasks SET status = ?, completed_at = ?, archived_at = ?, version = version + 1, updated_at = ? WHERE id = ? AND version = ?",
      )
      .run(
        status,
        status === "completed" ? timestamp : null,
        status === "archived" ? timestamp : null,
        timestamp,
        id,
        expectedVersion,
      );
    if (result.changes !== 1) throw new DatabaseConflictError("Task version conflict");
    this.recordAudit(actor, `task.${status}`, "task", id);
    this.bumpRevision();
    return this.getTask(id)!;
  }

  permanentlyDeleteArchivedTask(id: string, expectedVersion: number, actor: Actor): void {
    const current = this.getTask(id);
    if (!current) throw new DatabaseNotFoundError("Task not found");
    if (current.version !== expectedVersion) throw new DatabaseConflictError("Task version conflict");
    if (current.status !== "archived") throw new DatabaseValidationError("Only archived tasks can be permanently deleted");
    const result = this.sqlite.prepare("DELETE FROM tasks WHERE id = ? AND version = ? AND status = 'archived'").run(id, expectedVersion);
    if (result.changes !== 1) throw new DatabaseConflictError("Task version conflict");
    this.recordAudit(actor, "task.deleted", "task", id);
    this.bumpRevision();
  }

  getTask(id: string): Task | undefined {
    const row = this.sqlite.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as TaskRow | undefined;
    return row ? this.hydrateTask(row) : undefined;
  }

  listTasks(options: { includeArchived?: boolean } = {}): Task[] {
    const rows = this.sqlite
      .prepare(
        `SELECT * FROM tasks ${options.includeArchived ? "" : "WHERE status != 'archived'"}
         ORDER BY CASE WHEN due_date IS NULL THEN 1 ELSE 0 END, due_date, created_at, id`,
      )
      .all() as TaskRow[];
    return rows.map((row) => this.hydrateTask(row));
  }

  private getWorkspaceOrUndefined(): Workspace | undefined {
    const row = this.sqlite.prepare("SELECT * FROM workspaces LIMIT 1").get() as
      | { id: string; name: string; locale: Locale; time_zone: string; created_at: string; updated_at: string }
      | undefined;
    return row
      ? {
          id: row.id,
          name: row.name,
          locale: row.locale,
          timeZone: row.time_zone,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }
      : undefined;
  }

  private hydrateTask(row: TaskRow): Task {
    const assigneeIds = (
      this.sqlite.prepare("SELECT member_id FROM task_assignees WHERE task_id = ? ORDER BY ordinal").all(row.id) as Array<{
        member_id: string;
      }>
    ).map(({ member_id }) => member_id);
    const tags = (
      this.sqlite
        .prepare(
          "SELECT tags.name FROM task_tags JOIN tags ON tags.id = task_tags.tag_id WHERE task_tags.task_id = ? ORDER BY task_tags.ordinal",
        )
        .all(row.id) as Array<{ name: string }>
    ).map(({ name }) => name);
    let schedule: Schedule = null;
    if (row.schedule_type === "date" && row.due_date && row.time_zone) {
      schedule = { type: "date", date: row.due_date, timeZone: row.time_zone };
    } else if (row.schedule_type === "time" && row.start_at && row.end_at && row.time_zone) {
      schedule = { type: "time", startAt: row.start_at, endAt: row.end_at, timeZone: row.time_zone };
    }
    return {
      id: row.id,
      title: row.title,
      ...(row.note ? { note: row.note } : {}),
      status: row.status,
      assigneeIds,
      tags,
      schedule,
      version: row.version,
      createdBy: { type: row.created_by_type, id: row.created_by_id },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      ...(row.completed_at ? { completedAt: row.completed_at } : {}),
      ...(row.archived_at ? { archivedAt: row.archived_at } : {}),
    };
  }

  private assertMembers(ids: string[]): void {
    if (new Set(ids).size !== ids.length) throw new DatabaseValidationError("Assignees must be unique");
    for (const id of ids) {
      const member = this.getMember(id);
      if (!member || member.status !== "active") throw new DatabaseValidationError("Unknown active assignee");
    }
  }

  private replaceAssignees(taskId: string, memberIds: string[]): void {
    this.sqlite.prepare("DELETE FROM task_assignees WHERE task_id = ?").run(taskId);
    const insert = this.sqlite.prepare("INSERT INTO task_assignees(task_id, member_id, ordinal) VALUES(?, ?, ?)");
    memberIds.forEach((memberId, ordinal) => insert.run(taskId, memberId, ordinal));
  }

  private replaceTags(taskId: string, names: string[]): void {
    const workspace = this.getWorkspace();
    this.sqlite.prepare("DELETE FROM task_tags WHERE task_id = ?").run(taskId);
    const find = this.sqlite.prepare("SELECT id FROM tags WHERE workspace_id = ? AND normalized_name = ?");
    const insertTag = this.sqlite.prepare("INSERT INTO tags(id, workspace_id, name, normalized_name) VALUES(?, ?, ?, ?)");
    const link = this.sqlite.prepare("INSERT INTO task_tags(task_id, tag_id, ordinal) VALUES(?, ?, ?)");
    names.forEach((name, ordinal) => {
      const normalized = name.toLocaleLowerCase("en-US");
      const existing = find.get(workspace.id, normalized) as { id: string } | undefined;
      const tagId = existing?.id ?? randomUUID();
      if (!existing) insertTag.run(tagId, workspace.id, name, normalized);
      link.run(taskId, tagId, ordinal);
    });
  }

  private bumpRevision(): void {
    this.sqlite.prepare("UPDATE workspaces SET revision = revision + 1, updated_at = ?").run(now());
  }

  private recordAudit(actor: Actor, action: string, targetType: string, targetId: string): void {
    const table = this.sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'audit_events'").get();
    if (!table) return;
    this.sqlite
      .prepare(
        "INSERT INTO audit_events(id, actor_type, actor_id, action, target_type, target_id, created_at) VALUES(?, ?, ?, ?, ?, ?, ?)",
      )
      .run(randomUUID(), actor.type, actor.id, action, targetType, targetId, now());
  }
}

export function createTestDatabase(): HermesTodoDatabase {
  return new HermesTodoDatabase(new Database(":memory:"));
}

export function openDatabase(filePath: string): HermesTodoDatabase {
  const directory = dirname(filePath);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  if (process.platform !== "win32") chmodSync(directory, 0o700);
  const sqlite = new Database(filePath);
  sqlite.pragma("journal_mode = WAL");
  if (process.platform !== "win32") chmodSync(filePath, 0o600);
  return new HermesTodoDatabase(sqlite);
}
