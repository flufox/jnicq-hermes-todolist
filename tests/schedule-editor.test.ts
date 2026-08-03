import { describe, expect, it } from "vitest";

import { buildSchedule, scheduleDateKey, scheduleToEditorValues } from "../src/schedule";

describe("task editor scheduling", () => {
  it("turns a Home-local time range into an absolute timed schedule", () => {
    expect(
      buildSchedule({
        date: "2026-08-03",
        endDate: "2026-08-03",
        startTime: "09:30",
        endTime: "10:15",
        timeZone: "Europe/Moscow",
      }),
    ).toEqual({
      type: "time",
      startAt: "2026-08-03T06:30:00.000Z",
      endAt: "2026-08-03T07:15:00.000Z",
      timeZone: "Europe/Moscow",
    });
  });

  it("keeps a date-only task date-only when no time is selected", () => {
    expect(buildSchedule({ date: "2026-08-03", endDate: "", startTime: "", endTime: "", timeZone: "Europe/Moscow" })).toEqual({
      type: "date",
      date: "2026-08-03",
      timeZone: "Europe/Moscow",
    });
  });

  it("rejects an incomplete or reversed time range", () => {
    expect(() =>
      buildSchedule({ date: "2026-08-03", endDate: "", startTime: "09:30", endTime: "", timeZone: "Europe/Moscow" }),
    ).toThrow("both a start and an end time");
    expect(() =>
      buildSchedule({ date: "2026-08-03", endDate: "2026-08-03", startTime: "10:15", endTime: "09:30", timeZone: "Europe/Moscow" }),
    ).toThrow("end after its start");
  });

  it("restores timed tasks into editor fields in the Home timezone", () => {
    expect(
      scheduleToEditorValues({
        type: "time",
        startAt: "2026-08-03T06:30:00.000Z",
        endAt: "2026-08-03T07:15:00.000Z",
        timeZone: "Europe/Moscow",
      }),
    ).toEqual({ date: "2026-08-03", endDate: "2026-08-03", startTime: "09:30", endTime: "10:15" });
  });

  it("round-trips a timed task that ends on the next day", () => {
    const values = scheduleToEditorValues({
      type: "time",
      startAt: "2026-08-03T20:30:00.000Z",
      endAt: "2026-08-03T22:15:00.000Z",
      timeZone: "Europe/Moscow",
    });
    expect(values).toEqual({ date: "2026-08-03", endDate: "2026-08-04", startTime: "23:30", endTime: "01:15" });
    expect(buildSchedule({ ...values, timeZone: "Europe/Moscow" })).toEqual({
      type: "time",
      startAt: "2026-08-03T20:30:00.000Z",
      endAt: "2026-08-03T22:15:00.000Z",
      timeZone: "Europe/Moscow",
    });
  });

  it("groups timed tasks by their Home-local calendar date", () => {
    expect(
      scheduleDateKey({
        type: "time",
        startAt: "2026-08-03T23:30:00.000Z",
        endAt: "2026-08-04T00:00:00.000Z",
        timeZone: "Europe/Moscow",
      }),
    ).toBe("2026-08-04");
  });
});
