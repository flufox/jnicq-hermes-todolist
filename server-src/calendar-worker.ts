import "dotenv/config";
import { resolve } from "node:path";
import { openDatabase } from "./database.js";
import { decryptGoogleConfig, normalizeGoogleText, resolveGoogleConflict } from "./google.js";
import type { Schedule, Task } from "../shared/contracts.js";

type GoogleConfig = { clientId: string; clientSecret: string; refreshToken: string };
type GoogleEvent = {
  id: string;
  etag?: string;
  status?: string;
  summary?: string;
  description?: string;
  updated?: string;
  start?: { date?: string; dateTime?: string; timeZone?: string };
  end?: { date?: string; dateTime?: string; timeZone?: string };
};

const databasePath = resolve(process.env.HERMES_TODO_DATABASE_PATH ?? "data/hermes-todo.sqlite");
const masterKeyPath = resolve(process.env.HERMES_TODO_MASTER_KEY_PATH ?? "secrets/master.key");
const pollMilliseconds = Math.max(15_000, Number(process.env.HERMES_TODO_CALENDAR_POLL_MS ?? "30000"));
const database = openDatabase(databasePath);

async function accessToken(config: GoogleConfig): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const payload = (await response.json()) as { access_token?: string; error?: string };
  if (!response.ok || !payload.access_token) throw new Error(`Google access token refresh failed: ${payload.error ?? response.status}`);
  return payload.access_token;
}

function nextDate(date: string): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}

function taskBody(task: Task): object {
  const schedule = task.schedule!;
  return {
    summary: task.title,
    ...(task.note ? { description: task.note } : {}),
    start: schedule.type === "date" ? { date: schedule.date } : { dateTime: schedule.startAt, timeZone: schedule.timeZone },
    end:
      schedule.type === "date"
        ? { date: nextDate(schedule.date) }
        : { dateTime: schedule.endAt, timeZone: schedule.timeZone },
    extendedProperties: { private: { hermesTodoTaskId: task.id } },
  };
}

function eventSchedule(event: GoogleEvent, fallbackTimeZone: string): Schedule {
  if (event.start?.date) return { type: "date", date: event.start.date, timeZone: fallbackTimeZone };
  if (event.start?.dateTime && event.end?.dateTime) {
    return {
      type: "time",
      startAt: new Date(event.start.dateTime).toISOString(),
      endAt: new Date(event.end.dateTime).toISOString(),
      timeZone: event.start.timeZone ?? fallbackTimeZone,
    };
  }
  return null;
}

async function googleRequest<T>(token: string, url: string, init?: RequestInit): Promise<{ response: Response; payload?: T }> {
  const response = await fetch(url, { ...init, headers: { authorization: `Bearer ${token}`, ...(init?.headers ?? {}) } });
  const payload = response.status === 204 ? undefined : ((await response.json()) as T);
  return { response, payload };
}

async function syncOnce(): Promise<void> {
  const connection = database.getGoogleConnection();
  if (!connection || connection.status !== "active" || !connection.calendarId) return;
  const config = decryptGoogleConfig<GoogleConfig>(connection.encryptedConfig, masterKeyPath);
  const token = await accessToken(config);
  const calendar = encodeURIComponent(connection.calendarId);
  const workspace = database.getWorkspace();
  const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60_000).toISOString();
  const listed = await googleRequest<{ items?: GoogleEvent[] }>(
    token,
    `https://www.googleapis.com/calendar/v3/calendars/${calendar}/events?singleEvents=true&maxResults=100&timeMin=${encodeURIComponent(timeMin)}`,
  );
  if (!listed.response.ok) throw new Error(`Google event listing failed: ${listed.response.status}`);
  for (const event of listed.payload?.items ?? []) {
    if (!event.id || event.status === "cancelled") continue;
    const linked = database.sqlite
      .prepare("SELECT task_id FROM google_task_links WHERE google_event_id = ?")
      .get(event.id) as { task_id: string } | undefined;
    if (linked) continue;
    const schedule = eventSchedule(event, workspace.timeZone);
    if (!schedule) continue;
    const task = database.createTask(
      { type: "integration", id: connection.id },
      {
        title: normalizeGoogleText(event.summary ?? "Untitled calendar item", 160),
        note: normalizeGoogleText(event.description ?? "", 1000),
        assigneeIds: [],
        tags: ["google"],
        schedule,
      },
    );
    database.sqlite
      .prepare(
        "INSERT INTO google_task_links(task_id, google_event_id, etag, google_updated_at, task_version, sync_status, updated_at) VALUES(?, ?, ?, ?, ?, 'synced', ?)",
      )
      .run(task.id, event.id, event.etag ?? null, event.updated ?? null, task.version, new Date().toISOString());
  }
  const tasks = database.listTasks({ includeArchived: true });
  for (const task of tasks) {
    const link = database.sqlite
      .prepare("SELECT google_event_id, etag, google_updated_at, task_version FROM google_task_links WHERE task_id = ?")
      .get(task.id) as { google_event_id: string; etag: string | null; google_updated_at: string | null; task_version: number } | undefined;
    if (task.status === "archived" || !task.schedule) {
      if (link) {
        await googleRequest(token, `https://www.googleapis.com/calendar/v3/calendars/${calendar}/events/${encodeURIComponent(link.google_event_id)}`, { method: "DELETE" });
        database.sqlite.prepare("DELETE FROM google_task_links WHERE task_id = ?").run(task.id);
      }
      continue;
    }
    if (!link) {
      const { response, payload } = await googleRequest<GoogleEvent>(
        token,
        `https://www.googleapis.com/calendar/v3/calendars/${calendar}/events`,
        { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(taskBody(task)) },
      );
      if (!response.ok || !payload?.id) throw new Error(`Google event creation failed: ${response.status}`);
      database.sqlite
        .prepare(
          "INSERT INTO google_task_links(task_id, google_event_id, etag, google_updated_at, task_version, sync_status, updated_at) VALUES(?, ?, ?, ?, ?, 'synced', ?)",
        )
        .run(task.id, payload.id, payload.etag ?? null, payload.updated ?? null, task.version, new Date().toISOString());
      continue;
    }
    const fetched = await googleRequest<GoogleEvent>(
      token,
      `https://www.googleapis.com/calendar/v3/calendars/${calendar}/events/${encodeURIComponent(link.google_event_id)}`,
    );
    if (fetched.response.status === 404 || fetched.response.status === 410 || fetched.payload?.status === "cancelled") {
      database.setTaskStatus(task.id, task.version, "archived", { type: "integration", id: connection.id });
      database.sqlite.prepare("DELETE FROM google_task_links WHERE task_id = ?").run(task.id);
      continue;
    }
    if (!fetched.response.ok || !fetched.payload) throw new Error(`Google event read failed: ${fetched.response.status}`);
    const googleChanged = Boolean(link.etag && fetched.payload.etag && link.etag !== fetched.payload.etag);
    const resolution = resolveGoogleConflict({ taskVersion: task.version, syncedTaskVersion: link.task_version, googleChanged });
    if (resolution === "needs_attention") {
      database.sqlite
        .prepare("UPDATE google_task_links SET sync_status = 'needs_attention', last_error = ?, updated_at = ? WHERE task_id = ?")
        .run("Task and Google event changed concurrently", new Date().toISOString(), task.id);
      continue;
    }
    if (resolution === "google") {
      const updated = database.updateTask(task.id, task.version, { type: "integration", id: connection.id }, {
        title: normalizeGoogleText(fetched.payload.summary ?? "Untitled calendar item", 160),
        note: normalizeGoogleText(fetched.payload.description ?? "", 1000),
        schedule: eventSchedule(fetched.payload, workspace.timeZone),
      });
      database.sqlite
        .prepare("UPDATE google_task_links SET etag = ?, google_updated_at = ?, task_version = ?, sync_status = 'synced', last_error = NULL, updated_at = ? WHERE task_id = ?")
        .run(fetched.payload.etag ?? null, fetched.payload.updated ?? null, updated.version, new Date().toISOString(), task.id);
      continue;
    }
    if (resolution === "task") {
      const updated = await googleRequest<GoogleEvent>(
        token,
        `https://www.googleapis.com/calendar/v3/calendars/${calendar}/events/${encodeURIComponent(link.google_event_id)}`,
        {
          method: "PUT",
          headers: { "content-type": "application/json", ...(link.etag ? { "if-match": link.etag } : {}) },
          body: JSON.stringify(taskBody(task)),
        },
      );
      if (updated.response.status === 412) {
        database.sqlite
          .prepare("UPDATE google_task_links SET sync_status = 'needs_attention', last_error = ?, updated_at = ? WHERE task_id = ?")
          .run("Google event changed during update", new Date().toISOString(), task.id);
      } else if (updated.response.ok && updated.payload) {
        database.sqlite
          .prepare("UPDATE google_task_links SET etag = ?, google_updated_at = ?, task_version = ?, sync_status = 'synced', last_error = NULL, updated_at = ? WHERE task_id = ?")
          .run(updated.payload.etag ?? null, updated.payload.updated ?? null, task.version, new Date().toISOString(), task.id);
      }
    }
  }
}

let running = false;
async function tick(): Promise<void> {
  if (running) return;
  running = true;
  try {
    await syncOnce();
  } catch (error) {
    process.stderr.write(`Calendar sync failed: ${error instanceof Error ? error.message : "unknown error"}\n`);
  } finally {
    running = false;
  }
}

void tick();
const interval = setInterval(() => void tick(), pollMilliseconds);
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    clearInterval(interval);
    database.close();
    process.exit(0);
  });
}
