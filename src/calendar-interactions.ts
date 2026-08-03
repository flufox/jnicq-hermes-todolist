export const CALENDAR_DOUBLE_TAP_MS = 320;

export type CalendarTap = {
  date: string;
  at: number;
};

export function isFastRepeatedCalendarTap(
  previous: CalendarTap | undefined,
  next: CalendarTap,
  thresholdMs = CALENDAR_DOUBLE_TAP_MS,
): boolean {
  if (!previous || previous.date !== next.date) return false;
  const elapsed = next.at - previous.at;
  return elapsed >= 0 && elapsed <= thresholdMs;
}
