export type Locale = "en" | "ru";
export type MemberRole = "admin" | "member";
export type MemberStatus = "active" | "disabled";
export type TaskStatus = "open" | "completed" | "archived";
export type ApiScope = "tasks:read" | "tasks:write" | "calendar:sync";

export type Schedule =
  | null
  | { type: "date"; date: string; timeZone: string }
  | { type: "time"; startAt: string; endAt: string; timeZone: string };

export type Actor = { type: "member" | "integration" | "system"; id: string };

export type Workspace = {
  id: string;
  name: string;
  locale: Locale;
  timeZone: string;
  createdAt: string;
  updatedAt: string;
};

export type Member = {
  id: string;
  displayName: string;
  role: MemberRole;
  status: MemberStatus;
  createdAt: string;
};

export type AdminMember = Member & { telegramUserId: string };

export type Task = {
  id: string;
  title: string;
  note?: string;
  status: TaskStatus;
  assigneeIds: string[];
  tags: string[];
  schedule: Schedule;
  version: number;
  createdBy: Actor;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  archivedAt?: string;
};

export type TaskCreateInput = {
  title: string;
  note?: string;
  assigneeIds: string[];
  tags: string[];
  schedule: Schedule;
};

export type TaskUpdateInput = Partial<
  Pick<TaskCreateInput, "title" | "note" | "assigneeIds" | "tags" | "schedule">
>;

export type BootstrapPayload = {
  workspace: Workspace;
  viewer: Member;
  members: Member[];
  tasks: Task[];
  revision: number;
};

export type ApiErrorPayload = {
  error: { code: string; message: string; details?: unknown };
};
