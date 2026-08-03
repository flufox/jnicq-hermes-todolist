import { afterEach, describe, expect, test } from "vitest";
import { createTestDatabase, type HermesTodoDatabase } from "../server-src/database.js";

describe("HermesTodoDatabase", () => {
  let database: HermesTodoDatabase | undefined;

  afterEach(() => {
    database?.close();
    database = undefined;
  });

  test("a Home member can create and retrieve a scheduled shared task", () => {
    database = createTestDatabase();
    const workspace = database.initializeWorkspace({
      name: "Demo Home",
      locale: "en",
      timeZone: "UTC",
    });
    const admin = database.createMember({
      telegramUserId: "10001",
      displayName: "Alex",
      role: "admin",
    });
    const member = database.createMember({
      telegramUserId: "10002",
      displayName: "Morgan",
      role: "member",
    });

    const created = database.createTask(
      { type: "member", id: admin.id },
      {
        title: "Pick up groceries",
        note: "Milk and fruit",
        assigneeIds: [admin.id, member.id],
        tags: ["home"],
        schedule: { type: "date", date: "2026-08-01", timeZone: "UTC" },
      },
    );

    expect(database.getWorkspace()).toMatchObject({
      id: workspace.id,
      name: "Demo Home",
      locale: "en",
      timeZone: "UTC",
    });
    expect(database.listTasks()).toEqual([created]);
    expect(created).toMatchObject({
      title: "Pick up groceries",
      status: "open",
      assigneeIds: [admin.id, member.id],
      tags: ["home"],
      version: 1,
    });
  });

  test("numbered migrations are transactional and idempotent", () => {
    database = createTestDatabase();
    expect(
      database.sqlite.prepare("SELECT version FROM schema_migrations ORDER BY version").all(),
    ).toEqual([{ version: 1 }, { version: 2 }, { version: 3 }]);

    database.migrate();

    expect(
      database.sqlite.prepare("SELECT version FROM schema_migrations ORDER BY version").all(),
    ).toEqual([{ version: 1 }, { version: 2 }, { version: 3 }]);
    expect(database.sqlite.pragma("foreign_keys", { simple: true })).toBe(1);
    expect(database.sqlite.pragma("busy_timeout", { simple: true })).toBe(5000);
  });

  test("stale task updates are rejected instead of overwriting a newer change", () => {
    database = createTestDatabase();
    database.initializeWorkspace({ name: "Demo Home", locale: "en", timeZone: "UTC" });
    const admin = database.createMember({
      telegramUserId: "20001",
      displayName: "Alex",
      role: "admin",
    });
    const task = database.createTask(
      { type: "member", id: admin.id },
      { title: "Water the plants", assigneeIds: [], tags: [], schedule: null },
    );

    const updated = database.updateTask(
      task.id,
      task.version,
      { type: "member", id: admin.id },
      { title: "Water all the plants" },
    );
    expect(updated.version).toBe(2);

    expect(() =>
      database.updateTask(
        task.id,
        task.version,
        { type: "member", id: admin.id },
        { title: "Stale title" },
      ),
    ).toThrowError(/version conflict/i);
  });

  test("an invite can be claimed once and never stores its raw code", () => {
    database = createTestDatabase();
    database.initializeWorkspace({ name: "Demo Home", locale: "en", timeZone: "UTC" });
    const invite = database.createInvite(
      { type: "system", id: "setup" },
      {
        role: "admin",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
    );

    const member = database.claimInvite(invite.code, {
      telegramUserId: "30001",
      displayName: "Alex",
    });
    expect(member).toMatchObject({ role: "admin", telegramUserId: "30001" });
    const storedInvite = database.sqlite.prepare("SELECT token_hash FROM invites").get() as { token_hash: string };
    expect(storedInvite.token_hash).toMatch(/^scrypt-v1\$/);
    expect(storedInvite.token_hash).not.toBe(invite.code);
    expect(() =>
      database!.claimInvite(invite.code, {
        telegramUserId: "30002",
        displayName: "Morgan",
      }),
    ).toThrowError(/already been used/i);
  });

  test("API tokens authorize only their declared scopes", () => {
    database = createTestDatabase();
    database.initializeWorkspace({ name: "Demo Home", locale: "en", timeZone: "UTC" });
    const token = database.createApiToken(
      { type: "system", id: "setup" },
      { label: "Hermes Agent", scopes: ["tasks:read", "tasks:write"] },
    );

    expect(database.authenticateApiToken(token.value, "tasks:read")).toMatchObject({
      id: token.id,
      label: "Hermes Agent",
    });
    expect(database.authenticateApiToken(token.value, "calendar:sync")).toBeUndefined();
    const storedToken = database.sqlite.prepare("SELECT token_hash FROM api_tokens").get() as { token_hash: string };
    expect(storedToken.token_hash).toMatch(/^scrypt-v1\$/);
    expect(storedToken.token_hash).not.toBe(token.value);
  });
});
