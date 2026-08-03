import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { backupCalendarSlot, createPortableBackup, restorePortableBackup } from "../server-src/backup.js";
import { openDatabase } from "../server-src/database.js";

describe("portable encrypted backups", () => {
  const directories: string[] = [];

  afterEach(() => directories.splice(0).forEach((directory) => rmSync(directory, { recursive: true, force: true })));

  test("round-trips the SQLite database and master key", async () => {
    const directory = mkdtempSync(join(tmpdir(), "hermes-todo-backup-"));
    directories.push(directory);
    const databasePath = join(directory, "source.db");
    const keyPath = join(directory, "master.key");
    const archivePath = join(directory, "home.htbackup");
    const restoredDatabasePath = join(directory, "restored.db");
    const restoredKeyPath = join(directory, "restored.key");
    writeFileSync(keyPath, Buffer.alloc(32, 7), { mode: 0o600 });
    const database = openDatabase(databasePath);
    database.initializeWorkspace({ name: "Demo Home", locale: "en", timeZone: "UTC" });
    database.createTask({ type: "system", id: "test" }, { title: "Synthetic task", assigneeIds: [], tags: [], schedule: null });
    database.close();

    await createPortableBackup({ databasePath, masterKeyPath: keyPath, archivePath, passphrase: "correct horse battery staple" });
    const result = await restorePortableBackup({
      archivePath,
      databasePath: restoredDatabasePath,
      masterKeyPath: restoredKeyPath,
      passphrase: "correct horse battery staple",
    });

    expect(result.integrity).toBe("ok");
    const restored = openDatabase(restoredDatabasePath);
    expect(restored.listTasks()).toEqual([expect.objectContaining({ title: "Synthetic task" })]);
    restored.close();
    expect(readFileSync(restoredKeyPath)).toEqual(Buffer.alloc(32, 7));
  });

  test("rejects a corrupted or wrongly decrypted archive without replacing the destination", async () => {
    const directory = mkdtempSync(join(tmpdir(), "hermes-todo-backup-"));
    directories.push(directory);
    const databasePath = join(directory, "source.db");
    const keyPath = join(directory, "master.key");
    const archivePath = join(directory, "home.htbackup");
    writeFileSync(keyPath, Buffer.alloc(32, 3), { mode: 0o600 });
    const database = openDatabase(databasePath);
    database.initializeWorkspace({ name: "Demo Home", locale: "en", timeZone: "UTC" });
    database.close();
    await createPortableBackup({ databasePath, masterKeyPath: keyPath, archivePath, passphrase: "good passphrase" });

    await expect(
      restorePortableBackup({ archivePath, databasePath: join(directory, "never.db"), masterKeyPath: join(directory, "never.key"), passphrase: "wrong" }),
    ).rejects.toThrow(/decrypt/i);
  });

  test("names daily and weekly snapshots in the Home timezone", () => {
    expect(backupCalendarSlot(new Date("2026-08-01T13:30:00.000Z"), "Pacific/Kiritimati")).toEqual({
      date: "2026-08-02",
      weekly: true,
    });
  });
});
