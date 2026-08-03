import { describe, expect, it } from "vitest";

import {
  CALENDAR_DOUBLE_TAP_MS,
  isFastRepeatedCalendarTap,
  type CalendarTap,
} from "../src/calendar-interactions";

describe("calendar day opening regression", () => {
  const firstTap: CalendarTap = { date: "2026-08-06", at: 1_000 };

  it("opens only after a second fast tap on the same date", () => {
    expect(isFastRepeatedCalendarTap(undefined, firstTap)).toBe(false);
    expect(isFastRepeatedCalendarTap(firstTap, {
      date: firstTap.date,
      at: firstTap.at + CALENDAR_DOUBLE_TAP_MS,
    })).toBe(true);
  });

  it("does not treat a different or late tap as a double tap", () => {
    expect(isFastRepeatedCalendarTap(firstTap, { date: "2026-08-07", at: 1_100 })).toBe(false);
    expect(isFastRepeatedCalendarTap(firstTap, {
      date: firstTap.date,
      at: firstTap.at + CALENDAR_DOUBLE_TAP_MS + 1,
    })).toBe(false);
  });
});
