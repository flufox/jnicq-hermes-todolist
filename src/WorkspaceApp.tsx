import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  Archive,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  Copy,
  GripVertical,
  Moon,
  MoveHorizontal,
  MoveVertical,
  Pencil,
  Plus,
  RefreshCw,
  Settings,
  Sun,
  Users,
  Wifi,
  X,
} from "lucide-react";
import type { BootstrapPayload, Locale, Member, Schedule, Task, TaskStatus } from "../shared/contracts";
import { ApiError, api, subscribeToChanges } from "./api";
import { isFastRepeatedCalendarTap, type CalendarTap } from "./calendar-interactions";
import {
  calendarEntryScale,
  MAX_CALENDAR_DAY_HEIGHT,
  MIN_CALENDAR_DAY_HEIGHT,
  resizeCalendarDayHeight,
  resizeVisibleCalendarDays,
} from "./calendar-layout";
import { translate, type CopyKey } from "./i18n";
import { buildSchedule, scheduleDateKey, scheduleToEditorValues } from "./schedule";
import { haptic, initializeTelegram, telegramLanguage } from "./telegram";

type RangeMode = "14" | "28" | "custom";
type Theme = "light" | "dark";
type TimeFormat = "24h" | "12h";
type DragOrigin = { x: number; y: number; width: number; height: number; offsetX: number; offsetY: number };
type DragState = {
  task: Task;
  sourceDate?: string;
  targetDate?: string;
  origin: DragOrigin;
  x: number;
  y: number;
  phase: "dragging" | "dropping";
};

const uiKey = (name: string) => `hermes-todo-ui-v1:${name}`;
const copy = (locale: Locale, en: string, ru: string) => (locale === "ru" ? ru : en);
const workspaceDisplayName = (name: string) => name.trim().toLowerCase() === "demo home" ? "Hermes Demo" : name;
const dialogFocusSelector = "button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex='-1'])";

function useDialogFocus<T extends HTMLElement>() {
  const dialogRef = useRef<T>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = () => [...dialog.querySelectorAll<HTMLElement>(dialogFocusSelector)].filter((element) => element.offsetParent !== null);
    const frame = window.requestAnimationFrame(() => {
      if (!dialog.contains(document.activeElement)) (dialog.querySelector<HTMLElement>("[data-dialog-autofocus]") ?? focusable()[0])?.focus();
    });
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const elements = focusable();
      if (!elements.length) { event.preventDefault(); return; }
      const first = elements[0];
      const last = elements.at(-1) ?? first;
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trapFocus);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", trapFocus);
      if (previous && document.contains(previous)) previous.focus();
    };
  }, []);
  return dialogRef;
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromKey(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfWeek(date: Date): Date {
  const next = new Date(date);
  next.setHours(12, 0, 0, 0);
  next.setDate(next.getDate() - ((next.getDay() + 6) % 7));
  return next;
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function memberName(memberId: string, members: Member[]): string {
  return members.find((member) => member.id === memberId)?.displayName ?? "Member";
}

function taskDate(task: Task): string | undefined {
  return scheduleDateKey(task.schedule);
}

function formatRange(days: Date[], locale: Locale): string {
  const first = days[0];
  const last = days.at(-1) ?? first;
  const formatter = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" });
  if (first.getMonth() === last.getMonth()) {
    if (locale === "ru") return `${first.getDate()}–${formatter.format(last)}`;
    const month = new Intl.DateTimeFormat(locale, { month: "long" }).format(first);
    return `${month} ${first.getDate()}–${last.getDate()}`;
  }
  return `${formatter.format(first)} — ${formatter.format(last)}`;
}

function taskTime(task: Task, locale: Locale, timeFormat: TimeFormat): string {
  if (!task.schedule) return copy(locale, "No date", "Без даты");
  if (task.schedule.type === "date") return copy(locale, "All day", "Весь день");
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: task.schedule.timeZone,
    ...(timeFormat === "12h" ? { hour12: true } : { hourCycle: "h23" as const }),
  }).format(new Date(task.schedule.startAt));
}

export function normalize24HourInput(value: string): string | undefined {
  const compact = value.trim().replace(/[.\s]/g, ":");
  const match = compact.match(/^(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) return undefined;
  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? "00");
  if (hours > 23 || minutes > 59) return undefined;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function toTwelveHourTime(value: string): { clock: string; period: "AM" | "PM" } {
  const normalized = normalize24HourInput(value) ?? "00:00";
  const [hours, minutes] = normalized.split(":").map(Number);
  return {
    clock: `${hours % 12 || 12}:${String(minutes).padStart(2, "0")}`,
    period: hours >= 12 ? "PM" : "AM",
  };
}

export function fromTwelveHourTime(value: string, period: "AM" | "PM"): string | undefined {
  const match = value.trim().replace(/[.\s]/g, ":").match(/^(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) return undefined;
  const clockHours = Number(match[1]);
  const minutes = Number(match[2] ?? "00");
  if (clockHours < 1 || clockHours > 12 || minutes > 59) return undefined;
  const hours = (clockHours % 12) + (period === "PM" ? 12 : 0);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function compareDayTasks(left: Task, right: Task): number {
  const rank = (task: Task) => task.schedule?.type === "time" ? task.schedule.startAt : "";
  return rank(left).localeCompare(rank(right)) || left.title.localeCompare(right.title);
}

export function moveSchedule(task: Task, date: string, workspaceTimeZone: string): Schedule {
  if (!task.schedule || task.schedule.type === "date") {
    return { type: "date", date, timeZone: task.schedule?.timeZone ?? workspaceTimeZone };
  }
  const fields = scheduleToEditorValues(task.schedule);
  const durationDays = fields.endDate
    ? Math.max(0, Math.round((dateFromKey(fields.endDate).getTime() - dateFromKey(fields.date).getTime()) / 86_400_000))
    : 0;
  return buildSchedule({
    date,
    endDate: localDateKey(addDays(dateFromKey(date), durationDays)),
    startTime: fields.startTime,
    endTime: fields.endTime,
    timeZone: task.schedule.timeZone,
  });
}

export default function WorkspaceApp() {
  const initialLocale: Locale =
    localStorage.getItem(uiKey("locale")) === "ru" || telegramLanguage()?.startsWith("ru") ? "ru" : "en";
  const initialTheme: Theme = localStorage.getItem(uiKey("theme")) === "dark" ? "dark" : "light";
  const initialTimeFormat: TimeFormat = localStorage.getItem(uiKey("time-format")) === "12h" ? "12h" : "24h";
  const storedRange = localStorage.getItem(uiKey("range"));
  const initialRange: RangeMode = storedRange === "14" || storedRange === "28" || storedRange === "custom" ? storedRange : storedRange === "7" ? "custom" : "14";
  const storedCustomDays = Number(localStorage.getItem(uiKey("custom-days")));
  const initialCustomDays = Number.isInteger(storedCustomDays) && storedCustomDays >= 1 && storedCustomDays <= 7 ? storedCustomDays : 7;
  const initialZoom = localStorage.getItem(uiKey("calendar-zoom")) === "large" ? "large" : "compact";
  const storedCalendarDayHeight = Number(localStorage.getItem(uiKey("calendar-day-height")));
  const initialCalendarDayHeight = Number.isFinite(storedCalendarDayHeight) && storedCalendarDayHeight >= MIN_CALENDAR_DAY_HEIGHT && storedCalendarDayHeight <= MAX_CALENDAR_DAY_HEIGHT ? storedCalendarDayHeight : null;
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [timeFormat, setTimeFormat] = useState<TimeFormat>(initialTimeFormat);
  const [data, setData] = useState<BootstrapPayload>();
  const [loading, setLoading] = useState(true);
  const [joinRequired, setJoinRequired] = useState(false);
  const [error, setError] = useState<string>();
  const [view, setView] = useState<TaskStatus>("open");
  const [rangeMode, setRangeMode] = useState<RangeMode>(initialRange);
  const [customDays, setCustomDays] = useState(initialCustomDays);
  const [rangeStart, setRangeStart] = useState(() => startOfWeek(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => localDateKey(new Date()));
  const [calendarZoom, setCalendarZoom] = useState<"compact" | "large">(initialZoom);
  const [calendarDayHeight, setCalendarDayHeight] = useState<number | null>(initialCalendarDayHeight);
  const [calendarResizing, setCalendarResizing] = useState(false);
  const [editorTask, setEditorTask] = useState<Task | null | undefined>(undefined);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dayViewOpen, setDayViewOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string>();
  const [drag, setDrag] = useState<DragState>();
  const dragRef = useRef<DragState>();
  const dragTimerRef = useRef<number>();
  const dragMoveHandlerRef = useRef<(x: number, y: number) => void>();
  const dragFinishHandlerRef = useRef<(cancelled?: boolean) => void>();
  const calendarScrollRef = useRef<HTMLDivElement>(null);
  const calendarResizeTimerRef = useRef<number>();
  const calendarResizePointerRef = useRef<number>();
  const calendarResizeStartRef = useRef({ y: 0, height: 102 });
  const calendarResizingRef = useRef(false);
  const suppressZoomClickRef = useRef(false);
  const lastDayTapRef = useRef<CalendarTap>();
  const t = useCallback((key: CopyKey) => translate(locale, key), [locale]);

  const refresh = useCallback(async () => {
    try {
      const payload = await api.bootstrap();
      setData({ ...payload, workspace: { ...payload.workspace, name: workspaceDisplayName(payload.workspace.name) } });
      setJoinRequired(false);
      setError(undefined);
    } catch (reason) {
      if (reason instanceof ApiError && reason.code === "membership_required") setJoinRequired(true);
      else setError(reason instanceof Error ? reason.message : "Unable to open Hermes Todo");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeTelegram();
    void refresh();
  }, [refresh]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#171a18" : "#f2f1ec");
  }, [theme]);

  useEffect(() => {
    if (!data) return;
    const controller = new AbortController();
    let queued = false;
    void subscribeToChanges(() => {
      if (queued) return;
      queued = true;
      window.setTimeout(() => { queued = false; void refresh(); }, 200);
    }, controller.signal);
    const reconcile = window.setInterval(() => void refresh(), 30_000);
    return () => { controller.abort(); window.clearInterval(reconcile); };
  }, [data?.workspace.id, refresh]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(undefined), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setEditorTask(undefined);
      setSettingsOpen(false);
      setDayViewOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  useEffect(() => () => {
    window.clearTimeout(dragTimerRef.current);
    window.clearTimeout(calendarResizeTimerRef.current);
    document.body.classList.remove("is-task-dragging", "is-calendar-resizing");
  }, []);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (dragRef.current?.phase !== "dragging") return;
      event.preventDefault();
      dragMoveHandlerRef.current?.(event.clientX, event.clientY);
    };
    const finish = () => {
      if (dragRef.current?.phase === "dragging") dragFinishHandlerRef.current?.(false);
    };
    const cancel = (event: PointerEvent) => {
      if (dragRef.current?.phase !== "dragging") return;
      dragMoveHandlerRef.current?.(event.clientX, event.clientY);
      dragFinishHandlerRef.current?.(false);
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", cancel);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", cancel);
    };
  }, []);

  const setLanguage = (next: Locale) => {
    localStorage.setItem(uiKey("locale"), next);
    setLocale(next);
  };

  const setClockFormat = (next: TimeFormat) => {
    localStorage.setItem(uiKey("time-format"), next);
    setTimeFormat(next);
    haptic("light");
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    localStorage.setItem(uiKey("theme"), next);
    setTheme(next);
    haptic("light");
  };

  if (loading) return <LoadingState locale={locale} />;
  if (joinRequired) return <JoinWorkspace locale={locale} onJoined={refresh} onLanguage={setLanguage} />;
  if (!data) return <ErrorState error={error} locale={locale} onRetry={refresh} />;

  const rangeDays = rangeMode === "custom" ? customDays : Number(rangeMode);
  const days = Array.from({ length: rangeDays }, (_, index) => addDays(rangeStart, index));
  const today = localDateKey(new Date());
  const openTasks = data.tasks.filter((task) => task.status === "open");
  const scheduled = openTasks.filter((task) => taskDate(task));
  const backlog = openTasks.filter((task) => !taskDate(task));
  const selectedTasks = openTasks.filter((task) => taskDate(task) === selectedDate).sort(compareDayTasks);
  const completed = data.tasks.filter((task) => task.status === "completed").sort((a, b) => (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt));
  const archived = data.tasks.filter((task) => task.status === "archived").sort((a, b) => (b.archivedAt ?? b.updatedAt).localeCompare(a.archivedAt ?? a.updatedAt));
  const viewTasks = view === "completed" ? completed : archived;
  const tasksByDate = new Map<string, Task[]>();
  for (const task of scheduled) {
    const date = taskDate(task);
    if (!date) continue;
    tasksByDate.set(date, [...(tasksByDate.get(date) ?? []), task]);
  }
  for (const entries of tasksByDate.values()) entries.sort(compareDayTasks);

  const replaceTask = (task: Task) => {
    setData((current) => current ? { ...current, tasks: current.tasks.map((entry) => entry.id === task.id ? task : entry) } : current);
  };

  const withBusy = async (task: Task, operation: () => Promise<Task>, message: string) => {
    setBusyIds((current) => new Set(current).add(task.id));
    try {
      replaceTask(await operation());
      setToast(message);
      haptic("success");
    } catch (reason) {
      if (reason instanceof ApiError && reason.code === "version_conflict") void refresh();
      setError(reason instanceof Error ? reason.message : copy(locale, "Action failed", "Не удалось выполнить действие"));
      haptic("error");
    } finally {
      setBusyIds((current) => { const next = new Set(current); next.delete(task.id); return next; });
    }
  };

  const setTaskStatus = (task: Task, action: "complete" | "archive" | "restore") => withBusy(
    task,
    async () => (await api.setTaskStatus(task.id, task.version, action)).task,
    action === "complete" ? copy(locale, "Task completed", "Задача выполнена") :
      action === "archive" ? copy(locale, "Task archived", "Задача в архиве") : copy(locale, "Task restored", "Задача восстановлена"),
  );

  const moveTask = (task: Task, date: string) => withBusy(
    task,
    async () => (await api.updateTask(task.id, task.version, { schedule: moveSchedule(task, date, data.workspace.timeZone) })).task,
    copy(locale, "Task moved", "Задача перенесена"),
  );

  const dropDateAtPoint = (x: number, y: number) =>
    document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-drop-date]")?.dataset.dropDate;

  const updateDrag = (next: DragState | undefined) => {
    dragRef.current = next;
    setDrag(next);
  };

  const clearTaskDrag = () => {
    window.clearTimeout(dragTimerRef.current);
    dragTimerRef.current = undefined;
    updateDrag(undefined);
    document.body.classList.remove("is-task-dragging");
  };

  const beginTaskDrag = (task: Task, origin: DragOrigin) => {
    window.clearTimeout(dragTimerRef.current);
    const next: DragState = {
      task,
      sourceDate: taskDate(task),
      targetDate: dropDateAtPoint(origin.x, origin.y),
      origin,
      x: origin.x,
      y: origin.y,
      phase: "dragging",
    };
    updateDrag(next);
    setDayViewOpen(false);
    document.body.classList.add("is-task-dragging");
    haptic("light");
  };

  const moveTaskDrag = (x: number, y: number) => {
    const current = dragRef.current;
    if (!current || current.phase !== "dragging") return;
    const edge = 84;
    if (y < edge) window.scrollBy(0, -Math.ceil(4 + ((edge - y) / edge) * 10));
    else if (y > window.innerHeight - edge) window.scrollBy(0, Math.ceil(4 + ((y - window.innerHeight + edge) / edge) * 10));
    const targetDate = dropDateAtPoint(x, y);
    if (targetDate && targetDate !== current.targetDate) haptic("light");
    updateDrag({ ...current, x, y, targetDate });
  };

  const finishTaskDrag = (cancelled = false) => {
    const current = dragRef.current;
    if (!current || current.phase !== "dragging") return;
    if (cancelled || !current.targetDate || current.targetDate === current.sourceDate) {
      clearTaskDrag();
      return;
    }
    const target = document.querySelector<HTMLElement>(`[data-drop-date="${current.targetDate}"]`);
    const rect = target?.getBoundingClientRect();
    updateDrag({
      ...current,
      x: rect ? rect.left + rect.width / 2 : current.x,
      y: rect ? rect.top + rect.height / 2 : current.y,
      phase: "dropping",
    });
    haptic("medium");
    dragTimerRef.current = window.setTimeout(() => {
      dragTimerRef.current = undefined;
      void moveTask(current.task, current.targetDate!).finally(clearTaskDrag);
    }, 220);
  };
  dragMoveHandlerRef.current = moveTaskDrag;
  dragFinishHandlerRef.current = finishTaskDrag;

  const selectRange = (mode: RangeMode) => {
    setRangeMode(mode);
    localStorage.setItem(uiKey("range"), mode);
    haptic("light");
  };

  const changeCustomDays = (days: number) => {
    const next = resizeVisibleCalendarDays(days, 0);
    setCustomDays(next);
    localStorage.setItem(uiKey("custom-days"), String(next));
  };

  const toggleCalendarZoom = () => {
    if (suppressZoomClickRef.current) return;
    setCalendarZoom((value) => {
      const next = value === "compact" ? "large" : "compact";
      localStorage.setItem(uiKey("calendar-zoom"), next);
      return next;
    });
  };

  const beginCalendarResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    window.clearTimeout(calendarResizeTimerRef.current);
    calendarResizePointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    const measured = calendarScrollRef.current?.querySelector<HTMLElement>(".calendar-day")?.getBoundingClientRect().height ?? calendarDayHeight ?? (calendarZoom === "large" ? 172 : 102);
    calendarResizeStartRef.current = { y: event.clientY, height: measured };
    calendarResizeTimerRef.current = window.setTimeout(() => {
      calendarResizeTimerRef.current = undefined;
      calendarResizingRef.current = true;
      suppressZoomClickRef.current = true;
      const startHeight = resizeCalendarDayHeight(measured, 0);
      setCalendarDayHeight(startHeight);
      setCalendarResizing(true);
      document.body.classList.add("is-calendar-resizing");
      haptic("medium");
    }, 360);
  };

  const moveCalendarResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (calendarResizePointerRef.current !== event.pointerId) return;
    const deltaY = event.clientY - calendarResizeStartRef.current.y;
    if (!calendarResizingRef.current) {
      if (Math.abs(deltaY) > 10) {
        window.clearTimeout(calendarResizeTimerRef.current);
        suppressZoomClickRef.current = true;
      }
      return;
    }
    event.preventDefault();
    setCalendarDayHeight(resizeCalendarDayHeight(calendarResizeStartRef.current.height, deltaY));
  };

  const finishCalendarResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    window.clearTimeout(calendarResizeTimerRef.current);
    calendarResizeTimerRef.current = undefined;
    if (calendarResizePointerRef.current === event.pointerId && event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    calendarResizePointerRef.current = undefined;
    if (calendarResizingRef.current) {
      calendarResizingRef.current = false;
      setCalendarResizing(false);
      document.body.classList.remove("is-calendar-resizing");
      const measured = calendarScrollRef.current?.querySelector<HTMLElement>(".calendar-day")?.getBoundingClientRect().height;
      if (measured) localStorage.setItem(uiKey("calendar-day-height"), String(Math.round(measured)));
      haptic("light");
    }
    window.setTimeout(() => { suppressZoomClickRef.current = false; }, 0);
  };

  const entryScale = calendarEntryScale(calendarDayHeight, calendarZoom === "large" ? 172 : 102);

  const selectCalendarDay = (date: string) => {
    if (dragRef.current) return;
    const tap: CalendarTap = { date, at: performance.now() };
    const shouldOpen = isFastRepeatedCalendarTap(lastDayTapRef.current, tap);
    lastDayTapRef.current = shouldOpen ? undefined : tap;
    setSelectedDate(date);
    if (shouldOpen) setDayViewOpen(true);
    haptic(shouldOpen ? "medium" : "light");
  };

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">{copy(locale, "Skip to content", "К содержанию")}</a>
    <header className="app-header">
      <button className="brand" type="button" onClick={() => setView("open")} aria-label="Hermes Todo">
        <span className="brand-mark"><Check size={15} strokeWidth={3} /></span><strong>Hermes Todo</strong>
      </button>
      <nav className="primary-nav" aria-label={copy(locale, "Workspace views", "Разделы") }>
        <button type="button" aria-current={view === "open" ? "page" : undefined} className={view === "open" ? "active" : ""} onClick={() => setView("open")}><CalendarDays size={16} />{copy(locale, "Plan", "План")}</button>
        <button type="button" aria-current={view === "completed" ? "page" : undefined} className={view === "completed" ? "active" : ""} onClick={() => setView("completed")}><CheckCircle2 size={16} />{copy(locale, "Completed", "Готово")}<span>{completed.length}</span></button>
        <button type="button" aria-current={view === "archived" ? "page" : undefined} className={view === "archived" ? "active" : ""} onClick={() => setView("archived")}><Archive size={16} />{copy(locale, "Archive", "Архив")}<span>{archived.length}</span></button>
      </nav>
      <div className="header-actions">
        <span className="hermes-status"><Wifi size={14} />{copy(locale, "Hermes live", "Hermes на связи")}</span>
        <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={copy(locale, "Toggle theme", "Сменить тему")}>
          {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}<span>{theme === "dark" ? copy(locale, "Dark", "Тёмная") : copy(locale, "Light", "Светлая")}</span>
        </button>
        <button className="icon-button" type="button" onClick={() => setSettingsOpen(true)} aria-label={t("settings")}><Settings size={18} /></button>
      </div>
    </header>

    <main id="main-content">
      {view === "open" ? <>
        <section className="calendar-section" aria-labelledby="calendar-title">
          <div className="calendar-toolbar">
            <div className="calendar-heading">
              <p className="eyebrow">{workspaceDisplayName(data.workspace.name)}</p>
              <h1 id="calendar-title">{formatRange(days, locale)}</h1>
              <div className="calendar-overview">
                <span><strong>{(tasksByDate.get(today) ?? []).length}</strong>{copy(locale, "today", "сегодня")}</span>
                <span><strong>{openTasks.length}</strong>{copy(locale, "open", "в работе")}</span>
                <span><strong>{backlog.length}</strong>{copy(locale, "without date", "без даты")}</span>
              </div>
            </div>
            <div className="calendar-controls">
              <RangePicker locale={locale} mode={rangeMode} customDays={customDays} onModeChange={selectRange} onCustomDaysChange={changeCustomDays} />
              <button className={`zoom-button${calendarResizing ? " is-resizing" : ""}`} type="button" aria-pressed={calendarZoom === "large"} aria-label={copy(locale, "Change day height. Hold and drag vertically for precise sizing", "Изменить высоту дней. Удерживайте и ведите вертикально для точной настройки")} onClick={toggleCalendarZoom} onPointerDown={beginCalendarResize} onPointerMove={moveCalendarResize} onPointerUp={finishCalendarResize} onPointerCancel={finishCalendarResize} onContextMenu={(event) => event.preventDefault()}><MoveVertical size={16} /><span className="zoom-button-label">{calendarZoom === "compact" ? copy(locale, "Larger", "Крупнее") : copy(locale, "Compact", "Компактно")}</span></button>
              <button className="today-button" type="button" onClick={() => { const now = new Date(); setRangeStart(startOfWeek(now)); setSelectedDate(localDateKey(now)); }}>{t("today")}</button>
              <div className="arrow-controls"><button type="button" onClick={() => setRangeStart((value) => addDays(value, -rangeDays))} aria-label={copy(locale, "Previous range", "Предыдущий период")}><ChevronLeft size={19} /></button><button type="button" onClick={() => setRangeStart((value) => addDays(value, rangeDays))} aria-label={copy(locale, "Next range", "Следующий период")}><ChevronRight size={19} /></button></div>
            </div>
          </div>

          <div ref={calendarScrollRef} className={`calendar-scroll ${calendarZoom === "large" ? "is-large" : ""}${calendarResizing ? " is-resizing" : ""}`} style={{ "--calendar-columns": Math.min(rangeDays, 7), "--calendar-day-height": calendarDayHeight ? `${calendarDayHeight}px` : undefined, "--calendar-entry-scale": entryScale } as CSSProperties}>
            <div className="weekday-row" aria-hidden="true">{days.slice(0, 7).map((day) => <span key={localDateKey(day)}>{new Intl.DateTimeFormat(locale, { weekday: "short" }).format(day)}</span>)}</div>
            <div className="calendar-grid" role="group" aria-label={copy(locale, "Workspace calendar", "Календарь пространства") }>
              {days.map((day) => {
                const key = localDateKey(day);
                const entries = tasksByDate.get(key) ?? [];
                const dayLabel = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(day);
                return <button type="button" data-drop-date={key} aria-pressed={selectedDate === key} aria-label={`${dayLabel}: ${entries.length} ${copy(locale, entries.length === 1 ? "task" : "tasks", entries.length === 1 ? "задача" : "задач")}`} key={key}
                  className={`calendar-day${selectedDate === key ? " is-selected" : ""}${today === key ? " is-today" : ""}${[0, 6].includes(day.getDay()) ? " is-weekend" : ""}${drag?.sourceDate === key ? " is-drop-origin" : ""}${drag?.targetDate === key ? " is-drop-target" : ""}${drag?.phase === "dropping" && drag.targetDate === key ? " is-dropping" : ""}`}
                  onClick={() => selectCalendarDay(key)}>
                  <span className="date-number"><small>{new Intl.DateTimeFormat(locale, { weekday: "short" }).format(day)}</small><strong>{day.getDate()}</strong></span>
                  <span className="day-events">{entries.slice(0, 3).map((task) => <span className="calendar-event" key={task.id}><time>{taskTime(task, locale, timeFormat)}</time><span>{task.title}</span></span>)}{entries.length > 3 && <span className="more-events">+{entries.length - 3}</span>}{entries.length > 0 && <span className="mobile-event-count">{entries.length}</span>}</span>
                </button>;
              })}
            </div>
          </div>
          {drag && <div className="drag-hint" role="status">{drag.targetDate ? copy(locale, "Release to move", "Отпустите, чтобы перенести") : copy(locale, "Move onto a day", "Перетащите на день")}</div>}
          {calendarResizing && <div className="calendar-resize-readout" role="status">{Math.round(calendarDayHeight ?? 0)} px</div>}
        </section>

        <section className="lower-workspace" aria-label={copy(locale, "Tasks", "Задачи") }>
          <section className="workspace-panel selected-day" aria-labelledby="selected-day-title">
            <div className="section-heading"><div><p className="eyebrow">{copy(locale, "Selected date", "На выбранную дату")}</p><h2 id="selected-day-title">{new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(dateFromKey(selectedDate))}</h2></div><div className="heading-actions"><button type="button" className="quick-add-button" onClick={() => setEditorTask(null)} aria-label={copy(locale, "Add task to selected date", "Добавить задачу на выбранную дату")}><Plus size={15} /><span>{copy(locale, "Add", "Добавить")}</span></button><button type="button" className="text-button" onClick={() => setDayViewOpen(true)}>{copy(locale, "Open day", "Открыть день")}</button><span>{selectedTasks.length}</span></div></div>
            {selectedTasks.length ? <div className="agenda-list">{selectedTasks.map((task) => <TaskRow key={task.id} task={task} members={data.members} locale={locale} timeFormat={timeFormat} busy={busyIds.has(task.id)} isDragSource={drag?.task.id === task.id} onComplete={() => void setTaskStatus(task, "complete")} onEdit={() => setEditorTask(task)} onArchive={() => void setTaskStatus(task, "archive")} onRestore={() => void setTaskStatus(task, "restore")} onDragStart={(origin) => beginTaskDrag(task, origin)} onDragMove={moveTaskDrag} onDragEnd={() => finishTaskDrag()} onDragCancel={() => finishTaskDrag(true)} />)}</div> : <EmptyPanel locale={locale} onCreate={() => setEditorTask(null)} />}
          </section>
          <section className="workspace-panel backlog-section" aria-labelledby="backlog-title">
            <div className="section-heading"><div><p className="eyebrow">{copy(locale, "Backlog", "Бэклог")}</p><h2 id="backlog-title">{copy(locale, "Tasks without a date", "Задачи без даты")}</h2></div><span>{backlog.length}</span></div>
            {backlog.length ? <div className="agenda-list">{backlog.map((task) => <TaskRow key={task.id} task={task} members={data.members} locale={locale} timeFormat={timeFormat} busy={busyIds.has(task.id)} isDragSource={drag?.task.id === task.id} onComplete={() => void setTaskStatus(task, "complete")} onEdit={() => setEditorTask(task)} onArchive={() => void setTaskStatus(task, "archive")} onRestore={() => void setTaskStatus(task, "restore")} onDragStart={(origin) => beginTaskDrag(task, origin)} onDragMove={moveTaskDrag} onDragEnd={() => finishTaskDrag()} onDragCancel={() => finishTaskDrag(true)} />)}</div> : <div className="compact-empty"><strong>{copy(locale, "Backlog cleared", "Список разобран")}</strong><span>{copy(locale, "No unscheduled tasks.", "Задач без даты сейчас нет.")}</span></div>}
          </section>
          {completed.length > 0 && <section className={`workspace-panel activity-panel${activityOpen ? " is-expanded" : ""}`}>
            <button className="activity-toggle" type="button" aria-expanded={activityOpen} onClick={() => setActivityOpen((value) => !value)}><div><p className="eyebrow">{copy(locale, "Workspace activity", "Хронология пространства")}</p><h2>{copy(locale, "Recently completed", "Недавно завершённые")}</h2></div><span>{Math.min(5, completed.length)}<ChevronDown size={18} /></span></button>
            {activityOpen && <div className="agenda-list">{completed.slice(0, 5).map((task) => <TaskRow key={task.id} task={task} members={data.members} locale={locale} timeFormat={timeFormat} busy={busyIds.has(task.id)} onComplete={() => void setTaskStatus(task, "restore")} onEdit={() => setEditorTask(task)} onArchive={() => void setTaskStatus(task, "archive")} onRestore={() => void setTaskStatus(task, "restore")} />)}</div>}
          </section>}
        </section>
      </> : <section className="collection-view">
        <div className="collection-heading"><div><p className="eyebrow">{data.workspace.name}</p><h1>{view === "completed" ? copy(locale, "Completed tasks", "Выполненные задачи") : copy(locale, "Archive", "Архив")}</h1><p>{view === "completed" ? copy(locale, "Completed work stays visible and can be reopened.", "Выполненные задачи остаются видимыми и их можно вернуть.") : copy(locale, "Archived tasks are safe and recoverable.", "Архивные задачи сохранены и доступны для восстановления.")}</p></div><button className="primary-button" type="button" onClick={() => setEditorTask(null)}><Plus size={18} />{t("addTask")}</button></div>
        {viewTasks.length ? <div className="collection-list">{viewTasks.map((task) => <TaskRow key={task.id} task={task} members={data.members} locale={locale} timeFormat={timeFormat} busy={busyIds.has(task.id)} onComplete={() => void setTaskStatus(task, task.status === "completed" ? "restore" : "complete")} onEdit={() => setEditorTask(task)} onArchive={() => void setTaskStatus(task, "archive")} onRestore={() => void setTaskStatus(task, "restore")} />)}</div> : <div className="collection-empty"><Archive size={26} /><h2>{copy(locale, "Nothing here", "Здесь пока пусто")}</h2><p>{copy(locale, "Tasks will appear here when their status changes.", "Задачи появятся здесь после изменения статуса.")}</p></div>}
      </section>}
    </main>

    {error && <button className="error-toast" type="button" onClick={() => setError(undefined)}>{error}<X size={15} /></button>}
    <button className="entry-fab" type="button" onClick={() => setEditorTask(null)}><Plus size={19} />{t("addTask")}</button>
    {editorTask !== undefined && <TaskEditor locale={locale} members={data.members} task={editorTask} defaultDate={view === "open" ? selectedDate : null} timeZone={data.workspace.timeZone} timeFormat={timeFormat} onClose={() => setEditorTask(undefined)} onSaved={(task) => { setData((current) => current ? { ...current, tasks: current.tasks.some((entry) => entry.id === task.id) ? current.tasks.map((entry) => entry.id === task.id ? task : entry) : [task, ...current.tasks] } : current); setEditorTask(undefined); }} t={t} />}
    {dayViewOpen && <DayView date={selectedDate} tasks={selectedTasks} members={data.members} locale={locale} timeFormat={timeFormat} busyIds={busyIds} dragTaskId={drag?.task.id} onClose={() => setDayViewOpen(false)} onCreate={() => { setDayViewOpen(false); setEditorTask(null); }} onEdit={(task) => { setDayViewOpen(false); setEditorTask(task); }} onComplete={(task) => void setTaskStatus(task, "complete")} onArchive={(task) => void setTaskStatus(task, "archive")} onDragStart={beginTaskDrag} onDragMove={moveTaskDrag} onDragEnd={() => finishTaskDrag()} onDragCancel={() => finishTaskDrag(true)} />}
    {settingsOpen && <SettingsPanel data={data} locale={locale} timeFormat={timeFormat} onTimeFormat={setClockFormat} onLanguage={setLanguage} onClose={() => setSettingsOpen(false)} t={t} />}
    {drag && <TaskDragPreview drag={drag} locale={locale} />}
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>;
}

function RangePicker({ locale, mode, customDays, onModeChange, onCustomDaysChange }: { locale: Locale; mode: RangeMode; customDays: number; onModeChange: (mode: RangeMode) => void; onCustomDaysChange: (days: number) => void }) {
  const [open, setOpen] = useState(false);
  const [resizing, setResizing] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const holdTimerRef = useRef<number>();
  const pointerRef = useRef<number>();
  const startRef = useRef({ x: 0, days: customDays });
  const resizingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const customDaysRef = useRef(customDays);
  customDaysRef.current = customDays;

  const cancelHold = () => {
    window.clearTimeout(holdTimerRef.current);
    holdTimerRef.current = undefined;
  };

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!pickerRef.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); triggerRef.current?.focus(); } };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); window.removeEventListener("keydown", escape); };
  }, [open]);

  useEffect(() => () => {
    cancelHold();
    document.body.classList.remove("is-calendar-columns-resizing");
  }, []);

  const beginHold = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || mode !== "custom") return;
    cancelHold();
    pointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    startRef.current = { x: event.clientX, days: customDaysRef.current };
    holdTimerRef.current = window.setTimeout(() => {
      resizingRef.current = true;
      suppressClickRef.current = true;
      setOpen(false);
      setResizing(true);
      document.body.classList.add("is-calendar-columns-resizing");
      haptic("medium");
    }, 360);
  };

  const moveHold = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (pointerRef.current !== event.pointerId) return;
    const deltaX = event.clientX - startRef.current.x;
    if (!resizingRef.current) {
      if (Math.abs(deltaX) > 10) { cancelHold(); suppressClickRef.current = true; }
      return;
    }
    event.preventDefault();
    onCustomDaysChange(resizeVisibleCalendarDays(startRef.current.days, deltaX));
  };

  const finishHold = (event: ReactPointerEvent<HTMLButtonElement>) => {
    cancelHold();
    if (pointerRef.current === event.pointerId && event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    pointerRef.current = undefined;
    if (resizingRef.current) {
      resizingRef.current = false;
      setResizing(false);
      document.body.classList.remove("is-calendar-columns-resizing");
      haptic("light");
    }
    window.setTimeout(() => { suppressClickRef.current = false; }, 0);
  };

  const choose = (next: RangeMode) => {
    setOpen(false);
    onModeChange(next);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  };
  const dayWord = locale === "ru" ? (customDays === 1 ? "день" : customDays < 5 ? "дня" : "дней") : (customDays === 1 ? "day" : "days");
  const label = mode === "custom" ? `${customDays} ${dayWord}` : mode === "14" ? copy(locale, "2 weeks", "2 недели") : copy(locale, "4 weeks", "4 недели");

  return <div ref={pickerRef} className={`range-picker${open ? " is-open" : ""}${resizing ? " is-resizing" : ""}`}>
    <button ref={triggerRef} className="range-trigger" type="button" aria-haspopup="listbox" aria-expanded={open} aria-label={mode === "custom" ? copy(locale, `${label}. Hold and drag horizontally to change the number of days`, `${label}. Удерживайте и ведите горизонтально, чтобы изменить количество дней`) : copy(locale, `Calendar range: ${label}`, `Интервал календаря: ${label}`)} onClick={() => { if (!suppressClickRef.current) { setOpen((value) => !value); haptic("light"); } }} onKeyDown={(event) => { if (mode === "custom" && (event.key === "ArrowLeft" || event.key === "ArrowRight")) { event.preventDefault(); onCustomDaysChange(resizeVisibleCalendarDays(customDays, event.key === "ArrowLeft" ? -32 : 32)); } else if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); } }} onPointerDown={beginHold} onPointerMove={moveHold} onPointerUp={finishHold} onPointerCancel={finishHold} onContextMenu={(event) => event.preventDefault()}><CalendarDays size={15} aria-hidden="true" /><span>{label}</span><ChevronDown className="range-chevron" size={15} aria-hidden="true" /></button>
    {open && <div className="range-menu" role="listbox" aria-label={copy(locale, "Calendar range", "Интервал календаря")}><button type="button" role="option" aria-selected={mode === "custom"} onClick={() => choose("custom")}><span>{copy(locale, "1–7 days", "1–7 дней")}</span><MoveHorizontal size={14} aria-hidden="true" /></button><button type="button" role="option" aria-selected={mode === "14"} onClick={() => choose("14")}>{copy(locale, "2 weeks", "2 недели")}</button><button type="button" role="option" aria-selected={mode === "28"} onClick={() => choose("28")}>{copy(locale, "4 weeks", "4 недели")}</button></div>}
  </div>;
}

function TaskRow({ task, members, locale, timeFormat, busy, isDragSource, onComplete, onEdit, onArchive, onRestore, onDragStart, onDragMove, onDragEnd, onDragCancel }: {
  task: Task; members: Member[]; locale: Locale; timeFormat: TimeFormat; busy: boolean; isDragSource?: boolean; onComplete: () => void; onEdit: () => void; onArchive: () => void; onRestore: () => void;
  onDragStart?: (origin: DragOrigin) => void; onDragMove?: (x: number, y: number) => void; onDragEnd?: () => void; onDragCancel?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [holding, setHolding] = useState(false);
  const holdTimerRef = useRef<number>();
  const pointerIdRef = useRef<number>();
  const pointerStartRef = useRef({ x: 0, y: 0 });
  const pointerLatestRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const toggleDetails = () => { if (task.note) setExpanded((value) => !value); };
  const handleDetailsKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!task.note || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    toggleDetails();
  };
  useEffect(() => () => window.clearTimeout(holdTimerRef.current), []);
  const beginHold = (event: ReactPointerEvent<HTMLElement>) => {
    if (!onDragStart || event.button !== 0 || (event.target as Element).closest("button, input, textarea, select, a")) return;
    pointerIdRef.current = event.pointerId;
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    pointerLatestRef.current = pointerStartRef.current;
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);
    window.clearTimeout(holdTimerRef.current);
    setHolding(true);
    holdTimerRef.current = window.setTimeout(() => {
      draggingRef.current = true;
      suppressClickRef.current = true;
      const point = pointerLatestRef.current;
      onDragStart({ x: point.x, y: point.y, width: rect.width, height: rect.height, offsetX: point.x - rect.left, offsetY: point.y - rect.top });
    }, 420);
  };
  const moveHold = (event: ReactPointerEvent<HTMLElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    pointerLatestRef.current = { x: event.clientX, y: event.clientY };
    if (!draggingRef.current) {
      if (Math.hypot(event.clientX - pointerStartRef.current.x, event.clientY - pointerStartRef.current.y) > 10) {
        window.clearTimeout(holdTimerRef.current);
        setHolding(false);
      }
      return;
    }
    event.preventDefault();
    onDragMove?.(event.clientX, event.clientY);
  };
  const finishHold = (event: ReactPointerEvent<HTMLElement>, cancelled = false) => {
    if (pointerIdRef.current !== event.pointerId) return;
    window.clearTimeout(holdTimerRef.current);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    pointerIdRef.current = undefined;
    setHolding(false);
    if (!draggingRef.current) return;
    event.preventDefault();
    draggingRef.current = false;
    if (cancelled) onDragCancel?.();
    else {
      onDragMove?.(event.clientX, event.clientY);
      onDragEnd?.();
    }
  };
  return <article className={`task-row status-${task.status}${busy ? " is-busy" : ""}${expanded ? " is-expanded" : ""}${holding ? " is-holding" : ""}${isDragSource ? " is-drag-source" : ""}`} onPointerDown={beginHold} onPointerMove={moveHold} onPointerUp={(event) => finishHold(event)} onPointerCancel={(event) => finishHold(event)} onClickCapture={(event) => { if (!suppressClickRef.current) return; event.preventDefault(); event.stopPropagation(); suppressClickRef.current = false; }} onContextMenu={(event) => { if (onDragStart) event.preventDefault(); }}>
    {task.status !== "archived" && <button className="completion-button" type="button" disabled={busy} onClick={onComplete} aria-label={task.status === "completed" ? copy(locale, "Reopen", "Вернуть") : copy(locale, "Complete", "Выполнить")}>{busy ? <RefreshCw className="spin" size={18} /> : task.status === "completed" ? <CheckCircle2 size={21} /> : <Circle size={21} />}</button>}
    <div className={`task-row-content${task.note ? " is-expandable" : ""}`} role={task.note ? "button" : undefined} tabIndex={task.note ? 0 : undefined} aria-expanded={task.note ? expanded : undefined} onClick={toggleDetails} onKeyDown={handleDetailsKey}>
      <div className="task-row-title"><strong>{task.title}</strong><span className="task-schedule"><time>{taskTime(task, locale, timeFormat)}</time>{task.note && <ChevronDown size={14} aria-hidden="true" />}</span></div>
      {task.note && <p>{task.note}</p>}
      <div className="task-row-meta"><span className="avatar-stack">{task.assigneeIds.length ? task.assigneeIds.map((id) => <span key={id} title={memberName(id, members)}>{initials(memberName(id, members))}</span>) : <small>{copy(locale, "Everyone", "Всем")}</small>}</span>{task.tags.map((tag) => <span className="tag" key={tag}>#{tag}</span>)}</div>
    </div>
    <div className="row-actions">{task.status !== "archived" && <button className="edit-action" type="button" disabled={busy} onClick={onEdit} aria-label={`${copy(locale, "Edit", "Изменить")}: ${task.title}`}><Pencil size={16} /></button>}<button type="button" disabled={busy} onClick={task.status === "archived" ? onRestore : onArchive} aria-label={task.status === "archived" ? copy(locale, "Restore", "Восстановить") : copy(locale, "Archive", "В архив")}>{task.status === "archived" ? <RefreshCw size={16} /> : <Archive size={16} />}</button>{onDragStart && <span className="drag-grip" title={copy(locale, "Hold the task and drag it to another day", "Удерживайте задачу и перенесите её на другой день")} aria-hidden="true"><GripVertical size={17} /></span>}</div>
  </article>;
}

function TaskDragPreview({ drag, locale }: { drag: DragState; locale: Locale }) {
  const width = Math.min(300, Math.max(210, drag.origin.width * 0.78));
  const scale = drag.phase === "dropping" ? 0.24 : 1.018;
  const transform = `translate3d(${drag.x - width / 2}px, ${drag.y - 32}px, 0) rotate(${drag.phase === "dragging" ? -0.6 : 0}deg) scale(${scale})`;
  return <div className={`task-drag-preview is-${drag.phase}`} style={{ width, minHeight: 64, transform }} aria-hidden="true">
    <span className="task-drag-grip"><i /><i /><i /></span>
    <div><strong>{drag.task.title}</strong><small>{drag.targetDate ? new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "short" }).format(dateFromKey(drag.targetDate)) : copy(locale, "Move onto a day", "Наведите на день")}</small></div>
  </div>;
}

function EmptyPanel({ locale, onCreate }: { locale: Locale; onCreate: () => void }) {
  return <div className="empty-day"><CalendarDays size={22} /><div><strong>{copy(locale, "The day is clear", "День свободен")}</strong><span>{copy(locale, "Add a task when a plan appears.", "Добавьте задачу, когда появится план.")}</span></div><button type="button" onClick={onCreate}>{copy(locale, "Plan task", "Запланировать")}</button></div>;
}

function LoadingState({ locale }: { locale: Locale }) {
  return <main className="loading-page"><div className="loading-brand"><span className="brand-mark"><Check size={15} /></span>Hermes Todo</div><div className="loading-calendar" aria-label={copy(locale, "Loading", "Загрузка")}><span /><span /><span /><span /><span /><span /><span /></div><div className="loading-panels"><span /><span /></div></main>;
}

function ErrorState({ error, locale, onRetry }: { error?: string; locale: Locale; onRetry: () => Promise<void> }) {
  return <main className="center-state"><div className="brand-mark error"><X size={22} /></div><h1>Hermes Todo</h1><p>{error}</p><button className="primary-button" onClick={() => void onRetry()}><RefreshCw size={17} />{copy(locale, "Retry", "Повторить")}</button></main>;
}

function JoinWorkspace({ locale, onJoined, onLanguage }: { locale: Locale; onJoined: () => Promise<void>; onLanguage: (locale: Locale) => void }) {
  const [code, setCode] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState<string>();
  const t = (key: CopyKey) => translate(locale, key);
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); try { await api.claimInvite(code); haptic("success"); await onJoined(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Invite failed"); haptic("error"); } finally { setBusy(false); } };
  return <main className="join-page"><div className="language-toggle"><button className={locale === "en" ? "active" : ""} onClick={() => onLanguage("en")}>EN</button><button className={locale === "ru" ? "active" : ""} onClick={() => onLanguage("ru")}>RU</button></div><div className="join-card"><div className="brand-mark large"><Check size={24} /></div><span className="eyebrow">Hermes Todo</span><h1>{t("joinTitle")}</h1><p>{t("joinBody")}</p><form onSubmit={(event) => void submit(event)}><label>{t("inviteCode")}<input autoFocus autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="XXXX-XXXX-XXXX" /></label>{error && <div className="form-error">{error}</div>}<button className="primary-button wide" disabled={busy || code.length < 8}>{busy ? <RefreshCw className="spin" size={18} /> : <Users size={18} />}{t("join")}</button></form></div></main>;
}

function TaskEditor({ locale, members, task, defaultDate, timeZone, timeFormat, onClose, onSaved, t }: { locale: Locale; members: Member[]; task: Task | null; defaultDate: string | null; timeZone: string; timeFormat: TimeFormat; onClose: () => void; onSaved: (task: Task) => void; t: (key: CopyKey) => string }) {
  const dialogRef = useDialogFocus<HTMLElement>();
  const initial = scheduleToEditorValues(task?.schedule ?? null);
  const [title, setTitle] = useState(task?.title ?? ""); const [note, setNote] = useState(task?.note ?? ""); const [date, setDate] = useState(initial.date || defaultDate || ""); const [endDate, setEndDate] = useState(initial.endDate); const [startTime, setStartTime] = useState(initial.startTime); const [endTime, setEndTime] = useState(initial.endTime); const [tags, setTags] = useState(task?.tags.join(", ") ?? ""); const [assignees, setAssignees] = useState<string[]>(task?.assigneeIds ?? []); const [busy, setBusy] = useState(false); const [error, setError] = useState<string>();
  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const normalizedStart = startTime ? normalize24HourInput(startTime) : "";
      const normalizedEnd = endTime ? normalize24HourInput(endTime) : "";
      if ((startTime && !normalizedStart) || (endTime && !normalizedEnd)) throw new Error(copy(locale, "Enter time as HH:MM", "Введите время в формате ЧЧ:ММ"));
      const input = { title, note: note || undefined, assigneeIds: assignees, tags: tags.split(",").map((value) => value.trim().replace(/^#/, "")).filter(Boolean), schedule: buildSchedule({ date, endDate, startTime: normalizedStart, endTime: normalizedEnd, timeZone }) };
      const result = task ? await api.updateTask(task.id, task.version, input) : await api.createTask(input);
      haptic("success");
      onSaved(result.task);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Save failed");
      haptic("error");
    } finally { setBusy(false); }
  };
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section ref={dialogRef} className="modal task-sheet" role="dialog" aria-modal="true" aria-label={task ? t("edit") : t("addTask")}>
      <div className="modal-header"><div><span className="eyebrow">{task ? t("edit") : t("addTask")}</span><h2>{task?.title || copy(locale, "New task", "Новая задача")}</h2></div><button type="button" className="icon-button" aria-label={t("close")} onClick={onClose}><X size={19} /></button></div>
      <form className="task-form" onSubmit={(event) => void save(event)}>
        <label>{t("title")}<input data-dialog-autofocus maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label>{t("note")}<textarea maxLength={1000} rows={3} value={note} onChange={(event) => setNote(event.target.value)} /></label>
        <div className="form-grid schedule-grid">
          <label>{t("date")}<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
          <TimeInput label={t("startTime")} locale={locale} format={timeFormat} value={startTime} onChange={setStartTime} disabled={!date} />
          <label>{t("endDate")}<input type="date" value={endDate} min={date || undefined} onChange={(event) => setEndDate(event.target.value)} disabled={!date || (!startTime && !endTime)} /></label>
          <TimeInput label={t("endTime")} locale={locale} format={timeFormat} value={endTime} onChange={setEndTime} disabled={!date} />
        </div>
        <button className="clear-schedule" type="button" onClick={() => { setDate(""); setEndDate(""); setStartTime(""); setEndTime(""); }}>{copy(locale, "Move to backlog", "Убрать дату")}</button>
        <label>{t("tags")}<input value={tags} onChange={(event) => setTags(event.target.value)} placeholder={copy(locale, "personal, errands", "личное, покупки")} /></label>
        <fieldset><legend>{t("assignees")}</legend><div className="member-picker">{members.map((member) => <button type="button" className={assignees.includes(member.id) ? "selected" : ""} key={member.id} onClick={() => setAssignees((current) => current.includes(member.id) ? current.filter((id) => id !== member.id) : [...current, member.id])}><span>{initials(member.displayName)}</span>{member.displayName}{assignees.includes(member.id) && <Check size={15} />}</button>)}</div></fieldset>
        {error && <div className="form-error">{error}</div>}
        <div className="form-actions"><button type="button" className="secondary-button" onClick={onClose}>{t("cancel")}</button><button className="primary-button" disabled={busy || !title.trim()}>{busy ? <RefreshCw className="spin" size={17} /> : <Check size={17} />}{t("save")}</button></div>
      </form>
    </section>
  </div>;
}

function TimeInput({ label, locale, format, value, disabled, onChange }: { label: string; locale: Locale; format: TimeFormat; value: string; disabled: boolean; onChange: (value: string) => void }) {
  const initialTwelve = value ? toTwelveHourTime(value) : { clock: "", period: "AM" as const };
  const [draft, setDraft] = useState(format === "12h" ? initialTwelve.clock : value);
  const [period, setPeriod] = useState<"AM" | "PM">(initialTwelve.period);
  const [invalid, setInvalid] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (document.activeElement === inputRef.current) return;
    if (!value) { setDraft(""); return; }
    if (format === "12h") {
      const next = toTwelveHourTime(value);
      setDraft(next.clock);
      setPeriod(next.period);
    } else setDraft(value);
  }, [format, value]);
  const commit = (nextDraft = draft, nextPeriod = period) => {
    if (!nextDraft.trim()) { setInvalid(false); setDraft(""); onChange(""); return; }
    const normalized = format === "12h" ? fromTwelveHourTime(nextDraft, nextPeriod) : normalize24HourInput(nextDraft);
    setInvalid(!normalized);
    if (!normalized) return;
    onChange(normalized);
    setDraft(format === "12h" ? toTwelveHourTime(normalized).clock : normalized);
  };
  return <label className="time-field">{label}
    <span className={`time-input-control${invalid ? " is-invalid" : ""}`}>
      <Clock3 size={15} aria-hidden="true" />
      <input ref={inputRef} type="text" inputMode="numeric" autoComplete="off" maxLength={5} placeholder={format === "12h" ? "h:mm" : "00:00"} value={draft} disabled={disabled} aria-invalid={invalid} aria-label={`${label}, ${format === "12h" ? "AM/PM" : "24h"}`} onChange={(event) => { const next = event.target.value.replace(/[^\d:.\s]/g, "").slice(0, 5); setDraft(next); setInvalid(false); if (format === "24h") onChange(next); else { const normalized = fromTwelveHourTime(next, period); if (normalized) onChange(normalized); } }} onBlur={() => commit()} />
      {format === "12h" && <select className="time-period-select" value={period} disabled={disabled} aria-label={copy(locale, "Period", "Период")} onChange={(event) => { const next = event.target.value as "AM" | "PM"; setPeriod(next); commit(draft, next); }}><option>AM</option><option>PM</option></select>}
    </span>
  </label>;
}

function DayView({ date, tasks, members, locale, timeFormat, busyIds, dragTaskId, onClose, onCreate, onEdit, onComplete, onArchive, onDragStart, onDragMove, onDragEnd, onDragCancel }: { date: string; tasks: Task[]; members: Member[]; locale: Locale; timeFormat: TimeFormat; busyIds: Set<string>; dragTaskId?: string; onClose: () => void; onCreate: () => void; onEdit: (task: Task) => void; onComplete: (task: Task) => void; onArchive: (task: Task) => void; onDragStart: (task: Task, origin: DragOrigin) => void; onDragMove: (x: number, y: number) => void; onDragEnd: () => void; onDragCancel: () => void }) {
  const dialogRef = useDialogFocus<HTMLElement>();
  const sortedTasks = [...tasks].sort(compareDayTasks);
  return <div className="modal-backdrop day-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section ref={dialogRef} className="day-sheet" role="dialog" aria-modal="true" aria-label={copy(locale, "Day view", "Просмотр дня")}>
      <div className="modal-header"><div><p className="eyebrow">{copy(locale, "Day plan", "План дня")}</p><h2>{new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(dateFromKey(date))}</h2></div><div className="day-header-actions"><span className="day-sheet-count" aria-label={copy(locale, `${sortedTasks.length} tasks`, `${sortedTasks.length} задач`)}>{sortedTasks.length}</span><button className="icon-button" type="button" aria-label={copy(locale, "Close", "Закрыть")} onClick={onClose}><X size={19} /></button></div></div>
      {sortedTasks.length ? <div className="agenda-list day-agenda">{sortedTasks.map((task) => <TaskRow key={task.id} task={task} members={members} locale={locale} timeFormat={timeFormat} busy={busyIds.has(task.id)} isDragSource={dragTaskId === task.id} onComplete={() => onComplete(task)} onEdit={() => onEdit(task)} onArchive={() => onArchive(task)} onRestore={() => undefined} onDragStart={(origin) => onDragStart(task, origin)} onDragMove={onDragMove} onDragEnd={onDragEnd} onDragCancel={onDragCancel} />)}</div> : <EmptyPanel locale={locale} onCreate={onCreate} />}
      {sortedTasks.length > 0 && <p className="day-gesture-hint">{copy(locale, "Hold a task to move it to another day", "Удерживайте задачу, чтобы перенести её на другой день")}</p>}
      <button className="primary-button wide day-add-button" type="button" onClick={onCreate}><Plus size={18} />{copy(locale, "Add to this day", "Добавить на этот день")}</button>
    </section>
  </div>;
}

function SettingsPanel({ data, locale, timeFormat, onTimeFormat, onLanguage, onClose, t }: { data: BootstrapPayload; locale: Locale; timeFormat: TimeFormat; onTimeFormat: (format: TimeFormat) => void; onLanguage: (locale: Locale) => void; onClose: () => void; t: (key: CopyKey) => string }) {
  const dialogRef = useDialogFocus<HTMLDivElement>();
  const [invite, setInvite] = useState<string>(); const [copied, setCopied] = useState(false); const [busy, setBusy] = useState(false); const [googleStatus, setGoogleStatus] = useState<"loading" | "pending" | "active" | "needs_attention" | "disconnected">("loading"); const [clientId, setClientId] = useState(""); const [clientSecret, setClientSecret] = useState(""); const [integrationError, setIntegrationError] = useState<string>();
  useEffect(() => { if (data.viewer.role !== "admin") return; void api.googleStatus().then(({ integration }) => setGoogleStatus(integration.status)).catch(() => setGoogleStatus("disconnected")); }, [data.viewer.role]);
  const createInvite = async () => { setBusy(true); try { const result = await api.createInvite(); setInvite(result.invite.code); haptic("success"); } finally { setBusy(false); } };
  const copyInvite = async () => { if (!invite) return; await navigator.clipboard.writeText(invite); setCopied(true); window.setTimeout(() => setCopied(false), 1500); };
  const connectGoogle = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setIntegrationError(undefined); try { const { authorizationUrl } = await api.connectGoogle(clientId, clientSecret); window.location.assign(authorizationUrl); } catch (reason) { setIntegrationError(reason instanceof Error ? reason.message : "Google connection failed"); setBusy(false); } };
  const disconnectGoogle = async () => { setBusy(true); try { await api.disconnectGoogle(); setGoogleStatus("disconnected"); setClientId(""); setClientSecret(""); } finally { setBusy(false); } };
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <div ref={dialogRef} className="settings-panel" role="dialog" aria-modal="true" aria-label={t("settings")}>
      <div className="modal-header"><div><span className="eyebrow">{data.workspace.name}</span><h2>{t("settings")}</h2></div><button type="button" className="icon-button" aria-label={t("close")} onClick={onClose}><X size={19} /></button></div>
      <section className="settings-section time-format-section">
        <div className="settings-title"><Clock3 size={18} /><div><strong>{copy(locale, "Time format", "Формат времени")}</strong><span>{copy(locale, "Used in the calendar and task editor", "Используется в календаре и редакторе задач")}</span></div></div>
        <div className="segmented-control" aria-label={copy(locale, "Time format", "Формат времени")}>
          <button type="button" className={timeFormat === "24h" ? "active" : ""} aria-pressed={timeFormat === "24h"} onClick={() => onTimeFormat("24h")}>{copy(locale, "24 hour", "24 часа")}</button>
          <button type="button" className={timeFormat === "12h" ? "active" : ""} aria-pressed={timeFormat === "12h"} onClick={() => onTimeFormat("12h")}>AM/PM</button>
        </div>
      </section>
      <section className="settings-section"><div className="settings-title"><Users size={18} /><div><strong>{t("members")}</strong><span>{data.members.length}</span></div></div><div className="member-list">{data.members.map((member) => <div key={member.id}><span className="avatar">{initials(member.displayName)}</span><div><strong>{member.displayName}</strong><small>{member.role}</small></div></div>)}</div>{data.viewer.role === "admin" && <><button className="secondary-button wide" disabled={busy} onClick={() => void createInvite()}><Plus size={17} />{t("createInvite")}</button>{invite && <button className="invite-code" onClick={() => void copyInvite()}><code>{invite}</code><span>{copied ? t("copied") : t("inviteHint")}</span><Copy size={16} /></button>}</>}</section>
      <section className="settings-section"><div className="settings-title"><CalendarDays size={18} /><div><strong>{t("google")}</strong><span>{copy(locale, "Dedicated Hermes Todo calendar", "Отдельный календарь Hermes Todo")}</span></div></div><div className="integration-card"><span className="google-g">G</span><div><strong>Google Calendar</strong><small>{copy(locale, "Optional calendar Compose profile", "Опциональный Compose-профиль calendar")}</small></div><span className={googleStatus === "active" ? "status-on" : "status-off"}>{googleStatus === "loading" ? "…" : googleStatus.replace("_", " ")}</span></div>{data.viewer.role === "admin" && googleStatus === "disconnected" && <form className="google-connect-form" onSubmit={(event) => void connectGoogle(event)}><label>OAuth Client ID<input autoComplete="off" value={clientId} onChange={(event) => setClientId(event.target.value)} /></label><label>OAuth Client Secret<input type="password" autoComplete="new-password" value={clientSecret} onChange={(event) => setClientSecret(event.target.value)} /></label><button className="secondary-button wide" disabled={busy || clientId.length < 10 || clientSecret.length < 6}>{copy(locale, "Connect Google", "Подключить Google")}</button></form>}{data.viewer.role === "admin" && googleStatus !== "disconnected" && googleStatus !== "loading" && <button className="secondary-button wide" disabled={busy} onClick={() => void disconnectGoogle()}>{copy(locale, "Disconnect", "Отключить")}</button>}{integrationError && <div className="form-error">{integrationError}</div>}</section>
      <section className="settings-section compact-settings"><span>{copy(locale, "Language", "Язык")}</span><div className="language-toggle"><button className={locale === "en" ? "active" : ""} onClick={() => onLanguage("en")}>EN</button><button className={locale === "ru" ? "active" : ""} onClick={() => onLanguage("ru")}>RU</button></div></section>
      <p className="privacy-note">{t("security")}</p>
    </div>
  </div>;
}
