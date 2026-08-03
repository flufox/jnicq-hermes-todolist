import type { Schedule } from "../shared/contracts";

export type ScheduleEditorValues = {
  date: string;
  endDate: string;
  startTime: string;
  endTime: string;
};

type ScheduleEditorInput = ScheduleEditorValues & { timeZone: string };

const dateTimeFormatter = (timeZone: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

function zonedParts(date: Date, timeZone: string): Record<string, string> {
  return Object.fromEntries(
    dateTimeFormatter(timeZone)
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
}

function localDateTimeToIso(date: string, time: string, timeZone: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match || !timeMatch) throw new Error("Choose a valid date and time");
  const desired = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(timeMatch[1]), Number(timeMatch[2]));
  let instant = desired;
  for (let iteration = 0; iteration < 4; iteration += 1) {
    const parts = zonedParts(new Date(instant), timeZone);
    const observed = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
    );
    const adjustment = desired - observed;
    instant += adjustment;
    if (adjustment === 0) break;
  }
  const finalParts = zonedParts(new Date(instant), timeZone);
  if (
    `${finalParts.year}-${finalParts.month}-${finalParts.day}` !== date ||
    `${finalParts.hour}:${finalParts.minute}` !== time
  ) {
    throw new Error("That local time does not exist in the workspace timezone");
  }
  return new Date(instant).toISOString();
}

function isoEditorFields(value: string, timeZone: string): { date: string; time: string } {
  const parts = zonedParts(new Date(value), timeZone);
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

export function buildSchedule({ date, endDate, startTime, endTime, timeZone }: ScheduleEditorInput): Schedule {
  const normalizedDate = date.trim();
  const normalizedEndDate = endDate.trim();
  const normalizedStart = startTime.trim();
  const normalizedEnd = endTime.trim();
  if (!normalizedDate && !normalizedStart && !normalizedEnd) return null;
  if (!normalizedDate) throw new Error("Choose a date before adding a time");
  if (Boolean(normalizedStart) !== Boolean(normalizedEnd)) {
    throw new Error("A timed task needs both a start and an end time");
  }
  if (!normalizedStart) return { type: "date", date: normalizedDate, timeZone };
  const startAt = localDateTimeToIso(normalizedDate, normalizedStart, timeZone);
  const endAt = localDateTimeToIso(normalizedEndDate || normalizedDate, normalizedEnd, timeZone);
  if (Date.parse(endAt) <= Date.parse(startAt)) throw new Error("A timed task needs an end after its start");
  return { type: "time", startAt, endAt, timeZone };
}

export function scheduleToEditorValues(schedule: Schedule): ScheduleEditorValues {
  if (!schedule) return { date: "", endDate: "", startTime: "", endTime: "" };
  if (schedule.type === "date") return { date: schedule.date, endDate: "", startTime: "", endTime: "" };
  const start = isoEditorFields(schedule.startAt, schedule.timeZone);
  const end = isoEditorFields(schedule.endAt, schedule.timeZone);
  return { date: start.date, endDate: end.date, startTime: start.time, endTime: end.time };
}

export function scheduleDateKey(schedule: Schedule): string | undefined {
  if (!schedule) return undefined;
  if (schedule.type === "date") return schedule.date;
  return isoEditorFields(schedule.startAt, schedule.timeZone).date;
}
