import { afterEach, beforeEach, describe, expect, test } from "vitest";
import request from "supertest";
import { createApp, parseBearerToken } from "../server-src/app.js";
import { createTestDatabase, type HermesTodoDatabase } from "../server-src/database.js";

describe("Hermes Todo HTTP API", () => {
  let database: HermesTodoDatabase;

  beforeEach(() => {
    database = createTestDatabase();
    database.initializeWorkspace({ name: "Demo Home", locale: "en", timeZone: "UTC" });
  });

  afterEach(() => database.close());

  function app() {
    return createApp({
      database,
      config: {
        nodeEnv: "test",
        botToken: "unused-in-tests",
        publicUrl: "https://todo.example.com",
      },
      verifyIdentity: (value) => ({
        telegramUserId: value,
        displayName: value === "10001" ? "Alex" : "Morgan",
        languageCode: "en",
      }),
    });
  }

  test("Bearer tokens use a bounded parser without ambiguous whitespace", () => {
    const value = `ht_${"a".repeat(43)}`;
    expect(parseBearerToken(`Bearer ${value}`)).toBe(value);
    expect(parseBearerToken(`Bearer  ${value}`)).toBeUndefined();
    expect(parseBearerToken(`Bearer ${value} `)).toBeUndefined();
    expect(parseBearerToken(`Bearer ${" ".repeat(20_000)}`)).toBeUndefined();
  });

  test("an unknown Telegram user can claim an invite and then bootstrap", async () => {
    const invite = database.createInvite(
      { type: "system", id: "setup" },
      { role: "admin", expiresAt: new Date(Date.now() + 60_000).toISOString() },
    );

    await request(app()).get("/api/v1/bootstrap").set("x-telegram-init-data", "10001").expect(403, {
      error: { code: "membership_required", message: "Join this Home with an invite code." },
    });

    const claimed = await request(app())
      .post("/api/v1/invites/claim")
      .set("x-telegram-init-data", "10001")
      .send({ code: invite.code })
      .expect(201);
    expect(claimed.body.member).toMatchObject({ displayName: "Alex", role: "admin" });

    const bootstrap = await request(app()).get("/api/v1/bootstrap").set("x-telegram-init-data", "10001").expect(200);
    expect(bootstrap.body).toMatchObject({
      workspace: { name: "Demo Home", locale: "en", timeZone: "UTC" },
      viewer: { displayName: "Alex", role: "admin" },
      tasks: [],
    });
    expect(bootstrap.body.viewer.telegramUserId).toBeUndefined();
  });

  test("limits failed invite claims by IP and stable Telegram user", async () => {
    const server = app();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(server)
        .post("/api/v1/invites/claim")
        .set("x-telegram-init-data", "10002")
        .send({ code: `INVALID-${attempt}` })
        .expect(400);
    }
    await request(server)
      .post("/api/v1/invites/claim")
      .set("x-telegram-init-data", "10002")
      .send({ code: "INVALID-LAST" })
      .expect(429);
  });

  test("an attacker cannot bypass the invite limit by rotating claimed Telegram users", async () => {
    const server = app();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(server)
        .post("/api/v1/invites/claim")
        .set("x-telegram-init-data", `rotated-user-${attempt}`)
        .send({ code: `INVALID-${attempt}` })
        .expect(400);
    }
    await request(server)
      .post("/api/v1/invites/claim")
      .set("x-telegram-init-data", "rotated-user-last")
      .send({ code: "INVALID-LAST" })
      .expect(429);
  });

  test("members share task CRUD and stale writes receive 409", async () => {
    const admin = database.createMember({ telegramUserId: "10001", displayName: "Alex", role: "admin" });
    const member = database.createMember({ telegramUserId: "10002", displayName: "Morgan", role: "member" });

    const created = await request(app())
      .post("/api/v1/tasks")
      .set("x-telegram-init-data", "10002")
      .send({
        title: "Book a check-up",
        assigneeIds: [admin.id, member.id],
        tags: ["home"],
        schedule: { type: "date", date: "2026-08-02", timeZone: "UTC" },
      })
      .expect(201);

    const completed = await request(app())
      .post(`/api/v1/tasks/${created.body.task.id}/complete`)
      .set("x-telegram-init-data", "10001")
      .send({ version: created.body.task.version })
      .expect(200);
    expect(completed.body.task.status).toBe("completed");

    await request(app())
      .patch(`/api/v1/tasks/${created.body.task.id}`)
      .set("x-telegram-init-data", "10002")
      .send({ version: created.body.task.version, title: "Stale update" })
      .expect(409, {
        error: { code: "version_conflict", message: "This task changed elsewhere. Refresh and try again." },
      });
  });

  test("bootstrap includes archived tasks so the browser can restore them", async () => {
    database.createMember({ telegramUserId: "10001", displayName: "Alex", role: "admin" });
    const created = await request(app())
      .post("/api/v1/tasks")
      .set("x-telegram-init-data", "10001")
      .send({ title: "Synthetic archived task" })
      .expect(201);

    await request(app())
      .post(`/api/v1/tasks/${created.body.task.id}/archive`)
      .set("x-telegram-init-data", "10001")
      .send({ version: created.body.task.version })
      .expect(200);

    const bootstrap = await request(app()).get("/api/v1/bootstrap").set("x-telegram-init-data", "10001").expect(200);
    expect(bootstrap.body.tasks).toEqual([
      expect.objectContaining({ id: created.body.task.id, status: "archived", title: "Synthetic archived task" }),
    ]);
  });

  test("the agent API honors scopes and has no destructive endpoint", async () => {
    const token = database.createApiToken(
      { type: "system", id: "setup" },
      { label: "Hermes Agent", scopes: ["tasks:read", "tasks:write"] },
    );

    const created = await request(app())
      .post("/api/agent/v1/tasks")
      .set("authorization", `Bearer ${token.value}`)
      .send({ title: "Take out recycling", note: "Untrusted note", assigneeIds: [], tags: [], schedule: null })
      .expect(201);
    expect(created.body.task.createdBy.type).toBe("integration");

    const listed = await request(app())
      .get("/api/agent/v1/tasks?status=open")
      .set("authorization", `Bearer ${token.value}`)
      .expect(200);
    expect(listed.body.tasks).toHaveLength(1);
    expect(listed.body.tasks[0].note).toBeUndefined();

    await request(app())
      .post(`/api/agent/v1/tasks/${created.body.task.id}/complete`)
      .set("authorization", `Bearer ${token.value}`)
      .send({ version: created.body.task.version })
      .expect(200);
    const openAfterCompletion = await request(app())
      .get("/api/agent/v1/tasks?status=open")
      .set("authorization", `Bearer ${token.value}`)
      .expect(200);
    expect(openAfterCompletion.body.tasks).toEqual([]);

    await request(app())
      .delete(`/api/agent/v1/tasks/${created.body.task.id}`)
      .set("authorization", `Bearer ${token.value}`)
      .expect(404);

    await request(app()).get("/api/agent/v1/tasks").set("authorization", "Bearer invalid").expect(401);
  });

  test("the agent date filter uses each timed task's declared timezone", async () => {
    const token = database.createApiToken(
      { type: "system", id: "setup" },
      { label: "Hermes Agent", scopes: ["tasks:read", "tasks:write"] },
    );
    await request(app())
      .post("/api/agent/v1/tasks")
      .set("authorization", `Bearer ${token.value}`)
      .send({
        title: "Late Home task",
        schedule: {
          type: "time",
          startAt: "2026-08-03T23:30:00.000Z",
          endAt: "2026-08-04T00:00:00.000Z",
          timeZone: "Europe/Moscow",
        },
      })
      .expect(201);

    const localDay = await request(app())
      .get("/api/agent/v1/tasks?date=2026-08-04")
      .set("authorization", `Bearer ${token.value}`)
      .expect(200);
    expect(localDay.body.tasks.map((task: { title: string }) => task.title)).toEqual(["Late Home task"]);

    const utcDay = await request(app())
      .get("/api/agent/v1/tasks?date=2026-08-03")
      .set("authorization", `Bearer ${token.value}`)
      .expect(200);
    expect(utcDay.body.tasks).toEqual([]);
  });

  test("only admins can manage members, invites, and scoped API tokens", async () => {
    const admin = database.createMember({ telegramUserId: "10001", displayName: "Alex", role: "admin" });
    const member = database.createMember({ telegramUserId: "10002", displayName: "Morgan", role: "member" });

    await request(app())
      .post("/api/v1/admin/tokens")
      .set("x-telegram-init-data", "10002")
      .send({ label: "Hermes", scopes: ["tasks:read"] })
      .expect(403);

    const token = await request(app())
      .post("/api/v1/admin/tokens")
      .set("x-telegram-init-data", "10001")
      .send({ label: "Hermes", scopes: ["tasks:read", "tasks:write"] })
      .expect(201);
    expect(token.body.token.value).toMatch(/^ht_/);

    const tokens = await request(app())
      .get("/api/v1/admin/tokens")
      .set("x-telegram-init-data", "10001")
      .expect(200);
    expect(tokens.body.tokens).toEqual([
      expect.objectContaining({ id: token.body.token.id, label: "Hermes", scopes: ["tasks:read", "tasks:write"] }),
    ]);
    expect(JSON.stringify(tokens.body)).not.toContain(token.body.token.value);

    await request(app())
      .patch(`/api/v1/admin/members/${member.id}`)
      .set("x-telegram-init-data", "10001")
      .send({ status: "disabled" })
      .expect(200);
    await request(app()).get("/api/v1/bootstrap").set("x-telegram-init-data", "10002").expect(403);

    await request(app())
      .patch(`/api/v1/admin/members/${admin.id}`)
      .set("x-telegram-init-data", "10001")
      .send({ status: "disabled" })
      .expect(409);

    await request(app())
      .delete(`/api/v1/admin/tokens/${token.body.token.id}`)
      .set("x-telegram-init-data", "10001")
      .expect(204);
    await request(app())
      .get("/api/agent/v1/tasks")
      .set("authorization", `Bearer ${token.body.token.value}`)
      .expect(401);
  });

  test("only an admin can permanently delete an already archived task", async () => {
    database.createMember({ telegramUserId: "10001", displayName: "Alex", role: "admin" });
    database.createMember({ telegramUserId: "10002", displayName: "Morgan", role: "member" });
    const created = await request(app())
      .post("/api/v1/tasks")
      .set("x-telegram-init-data", "10002")
      .send({ title: "Synthetic disposable task" })
      .expect(201);
    const archived = await request(app())
      .post(`/api/v1/tasks/${created.body.task.id}/archive`)
      .set("x-telegram-init-data", "10002")
      .send({ version: created.body.task.version })
      .expect(200);

    await request(app())
      .delete(`/api/v1/admin/tasks/${created.body.task.id}`)
      .set("x-telegram-init-data", "10002")
      .send({ version: archived.body.task.version, confirmation: "DELETE" })
      .expect(403);
    await request(app())
      .delete(`/api/v1/admin/tasks/${created.body.task.id}`)
      .set("x-telegram-init-data", "10001")
      .send({ version: archived.body.task.version, confirmation: "DELETE" })
      .expect(204);
    expect(database.listTasks({ includeArchived: true })).toEqual([]);
  });
});
