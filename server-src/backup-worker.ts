import "dotenv/config";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { backupCalendarSlot, createSqliteSnapshot } from "./backup.js";

const databasePath = resolve(process.env.HERMES_TODO_DATABASE_PATH ?? "data/hermes-todo.sqlite");
const backupDirectory = resolve(process.env.HERMES_TODO_BACKUP_DIRECTORY ?? "backups");
const timeZone = process.env.HERMES_TODO_TIMEZONE ?? process.env.TZ ?? "UTC";

async function backup(): Promise<void> {
  mkdirSync(backupDirectory, { recursive: true, mode: 0o700 });
  const now = new Date();
  const slot = backupCalendarSlot(now, timeZone);
  const daily = resolve(backupDirectory, `daily-${slot.date}.sqlite`);
  await createSqliteSnapshot(databasePath, daily);
  if (slot.weekly) {
    await createSqliteSnapshot(databasePath, resolve(backupDirectory, `weekly-${slot.date}.sqlite`));
  }
  const files = readdirSync(backupDirectory).filter((name) => /^(daily|weekly)-\d{4}-\d{2}-\d{2}\.sqlite$/.test(name));
  const expired = [
    ...files.filter((name) => name.startsWith("daily-")).sort().reverse().slice(7),
    ...files.filter((name) => name.startsWith("weekly-")).sort().reverse().slice(4),
  ];
  for (const name of expired) rmSync(resolve(backupDirectory, name), { force: true });
}

function millisecondsUntilNextRun(): number {
  const next = new Date();
  next.setHours(3, 0, 0, 0);
  if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);
  return next.getTime() - Date.now();
}

function schedule(): void {
  setTimeout(() => void backup().finally(schedule), millisecondsUntilNextRun());
}

schedule();
process.stdout.write("Hermes Todo backup scheduler ready; next run is 03:00 in the configured container timezone.\n");
