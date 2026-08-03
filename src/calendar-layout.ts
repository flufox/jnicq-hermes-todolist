export const MIN_CALENDAR_DAY_HEIGHT = 78;
export const MAX_CALENDAR_DAY_HEIGHT = 240;
export const MIN_VISIBLE_CALENDAR_DAYS = 1;
export const MAX_VISIBLE_CALENDAR_DAYS = 7;

const CALENDAR_DAY_SWIPE_STEP = 32;

export function resizeCalendarDayHeight(startHeight: number, deltaY: number): number {
  return Math.round(Math.min(MAX_CALENDAR_DAY_HEIGHT, Math.max(MIN_CALENDAR_DAY_HEIGHT, startHeight + deltaY)));
}

export function resizeVisibleCalendarDays(startDays: number, deltaX: number): number {
  const nextDays = startDays + Math.round(deltaX / CALENDAR_DAY_SWIPE_STEP);
  return Math.min(MAX_VISIBLE_CALENDAR_DAYS, Math.max(MIN_VISIBLE_CALENDAR_DAYS, nextDays));
}

export function calendarEntryScale(dayHeight: number | null, baselineHeight: number): number {
  if (dayHeight === null || baselineHeight <= 0) return 1;
  return Math.round(Math.min(1.75, Math.max(0.9, dayHeight / baselineHeight)) * 1000) / 1000;
}
