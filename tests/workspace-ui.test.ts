import { describe, expect, it } from "vitest";
import type { Schedule, Task } from "../shared/contracts";
import { fromTwelveHourTime, moveSchedule, normalize24HourInput, toTwelveHourTime } from "../src/WorkspaceApp";
import { scheduleToEditorValues } from "../src/schedule";

function taskWith(schedule: Schedule): Task {
  return {
    id: "task-1",
    title: "Synthetic task",
    status: "open",
    assigneeIds: [],
    tags: [],
    schedule,
    version: 1,
    createdBy: { type: "member", id: "member-1" },
    createdAt: "2026-07-31T09:00:00.000Z",
    updatedAt: "2026-07-31T09:00:00.000Z",
  };
}

describe("calendar rescheduling", () => {
  it("turns an unscheduled task into a date-only task in the Home timezone", () => {
    expect(moveSchedule(taskWith(null), "2026-08-04", "Europe/Moscow")).toEqual({
      type: "date",
      date: "2026-08-04",
      timeZone: "Europe/Moscow",
    });
  });

  it("preserves the timezone of a date-only task", () => {
    expect(moveSchedule(taskWith({ type: "date", date: "2026-07-31", timeZone: "Asia/Tokyo" }), "2026-08-05", "UTC")).toEqual({
      type: "date",
      date: "2026-08-05",
      timeZone: "Asia/Tokyo",
    });
  });

  it("preserves local times and multi-day duration for timed tasks", () => {
    const moved = moveSchedule(taskWith({
      type: "time",
      startAt: "2026-07-31T15:00:00.000Z",
      endAt: "2026-08-01T06:30:00.000Z",
      timeZone: "Europe/Moscow",
    }), "2026-08-05", "UTC");

    expect(scheduleToEditorValues(moved)).toEqual({
      date: "2026-08-05",
      endDate: "2026-08-06",
      startTime: "18:00",
      endTime: "09:30",
    });
  });
});

describe("time format preferences", () => {
  it("normalizes 24-hour input without relying on browser locale", () => {
    expect(normalize24HourInput("9:05")).toBe("09:05");
    expect(normalize24HourInput("1830")).toBe("18:30");
    expect(normalize24HourInput("24:10")).toBeUndefined();
  });

  it("converts between 24-hour values and AM/PM editor values", () => {
    expect(toTwelveHourTime("00:15")).toEqual({ clock: "12:15", period: "AM" });
    expect(toTwelveHourTime("18:30")).toEqual({ clock: "6:30", period: "PM" });
    expect(fromTwelveHourTime("12:15", "AM")).toBe("00:15");
    expect(fromTwelveHourTime("6:30", "PM")).toBe("18:30");
  });
});
