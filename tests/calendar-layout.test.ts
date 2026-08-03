import { describe, expect, it } from "vitest";

import {
  calendarEntryScale,
  MAX_CALENDAR_DAY_HEIGHT,
  MAX_VISIBLE_CALENDAR_DAYS,
  MIN_CALENDAR_DAY_HEIGHT,
  MIN_VISIBLE_CALENDAR_DAYS,
  resizeCalendarDayHeight,
  resizeVisibleCalendarDays,
} from "../src/calendar-layout";

describe("original calendar resize gestures", () => {
  it("resizes day cards vertically within the original limits", () => {
    expect(resizeCalendarDayHeight(100, 38)).toBe(138);
    expect(resizeCalendarDayHeight(100, -1000)).toBe(MIN_CALENDAR_DAY_HEIGHT);
    expect(resizeCalendarDayHeight(100, 1000)).toBe(MAX_CALENDAR_DAY_HEIGHT);
  });

  it("turns horizontal movement into one to seven visible days", () => {
    expect(resizeVisibleCalendarDays(4, 32)).toBe(5);
    expect(resizeVisibleCalendarDays(4, -64)).toBe(2);
    expect(resizeVisibleCalendarDays(1, -200)).toBe(MIN_VISIBLE_CALENDAR_DAYS);
    expect(resizeVisibleCalendarDays(7, 200)).toBe(MAX_VISIBLE_CALENDAR_DAYS);
  });

  it("scales calendar entries with precise day height", () => {
    expect(calendarEntryScale(null, 100)).toBe(1);
    expect(calendarEntryScale(150, 100)).toBe(1.5);
  });
});
