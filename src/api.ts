import type { BootstrapPayload, MemberRole, Task, TaskCreateInput, TaskUpdateInput } from "../shared/contracts";
import { telegramInitData } from "./telegram";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-telegram-init-data": telegramInitData(),
      ...init.headers,
    },
  });
  const payload = response.status === 204 ? undefined : await response.json().catch(() => undefined);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.error?.code ?? "request_failed",
      payload?.error?.message ?? "The request could not be completed.",
    );
  }
  return payload as T;
}

export const api = {
  bootstrap: () => request<BootstrapPayload>("/api/v1/bootstrap"),
  claimInvite: (code: string) =>
    request<{ member: BootstrapPayload["viewer"] }>("/api/v1/invites/claim", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),
  createTask: (input: TaskCreateInput) =>
    request<{ task: Task }>("/api/v1/tasks", { method: "POST", body: JSON.stringify(input) }),
  updateTask: (id: string, version: number, patch: TaskUpdateInput) =>
    request<{ task: Task }>(`/api/v1/tasks/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ version, ...patch }),
    }),
  setTaskStatus: (id: string, version: number, action: "complete" | "archive" | "restore") =>
    request<{ task: Task }>(`/api/v1/tasks/${encodeURIComponent(id)}/${action}`, {
      method: "POST",
      body: JSON.stringify({ version }),
    }),
  createInvite: (role: MemberRole = "member") =>
    request<{ invite: { id: string; code: string; role: MemberRole; expiresAt: string } }>(
      "/api/v1/admin/invites",
      { method: "POST", body: JSON.stringify({ role, expiresInHours: 24 }) },
    ),
  googleStatus: () =>
    request<{ integration: { status: "pending" | "active" | "needs_attention" | "disconnected"; calendarId?: string; updatedAt?: string } }>(
      "/api/v1/admin/integrations/google",
    ),
  connectGoogle: (clientId: string, clientSecret: string) =>
    request<{ authorizationUrl: string }>("/api/v1/admin/integrations/google/connect", {
      method: "POST",
      body: JSON.stringify({ clientId, clientSecret }),
    }),
  disconnectGoogle: () => request<void>("/api/v1/admin/integrations/google", { method: "DELETE" }),
};

export async function subscribeToChanges(
  onChange: () => void,
  signal: AbortSignal,
): Promise<void> {
  let delay = 1_000;
  while (!signal.aborted) {
    try {
      const response = await fetch("/api/v1/events", {
        headers: { "x-telegram-init-data": telegramInitData(), accept: "text/event-stream" },
        signal,
      });
      if (!response.ok || !response.body) throw new Error("SSE unavailable");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (!signal.aborted) {
        const chunk = await reader.read();
        if (chunk.done) break;
        delay = 1_000;
        buffer += decoder.decode(chunk.value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          if (/^event: (task|member|integration)\.changed/m.test(frame)) onChange();
        }
      }
      if (!signal.aborted) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = Math.min(delay * 2, 30_000);
      }
    } catch (error) {
      if (signal.aborted) return;
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, 30_000);
    }
  }
}
