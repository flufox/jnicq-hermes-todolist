import { createHash, randomUUID } from "node:crypto";
import compression from "compression";
import express, { type NextFunction, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { z } from "zod";
import type { Actor, ApiScope, Member, Task } from "../shared/contracts.js";
import {
  DatabaseConflictError,
  DatabaseNotFoundError,
  DatabaseValidationError,
  type HermesTodoDatabase,
} from "./database.js";
import { EventBus } from "./events.js";
import {
  buildGoogleAuthorizationUrl,
  createGooglePkce,
  decryptGoogleConfig,
  encryptGoogleConfig,
} from "./google.js";
import {
  TelegramAuthError,
  type TelegramIdentity,
  verifyTelegramInitData,
} from "./telegram-auth.js";

type AppConfig = {
  nodeEnv: string;
  botToken: string;
  publicUrl?: string;
  masterKeyPath?: string;
};

type BrowserContext = {
  identity: TelegramIdentity;
  member: ReturnType<HermesTodoDatabase["getMemberByTelegramId"]>;
};

type AgentContext = {
  id: string;
  label: string;
};

export function parseBearerToken(authorization: string): string | undefined {
  if (authorization.length !== 53 || authorization.slice(0, 7).toLowerCase() !== "bearer ") return undefined;
  const token = authorization.slice(7);
  if (!token.startsWith("ht_") || token.length !== 46) return undefined;
  for (const character of token.slice(3)) {
    const code = character.charCodeAt(0);
    const allowed =
      (code >= 48 && code <= 57) ||
      (code >= 65 && code <= 90) ||
      (code >= 97 && code <= 122) ||
      character === "-" ||
      character === "_";
    if (!allowed) return undefined;
  }
  return token;
}

export type CreateAppOptions = {
  database: HermesTodoDatabase;
  config: AppConfig;
  eventBus?: EventBus;
  verifyIdentity?: (initData: string) => TelegramIdentity;
  fetchImpl?: typeof fetch;
};

const scheduleSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("date"), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), timeZone: z.string().min(1) }),
  z.object({
    type: z.literal("time"),
    startAt: z.string().datetime({ offset: true }),
    endAt: z.string().datetime({ offset: true }),
    timeZone: z.string().min(1),
  }),
]);

const taskCreateSchema = z.object({
  title: z.string().trim().min(1).max(160),
  note: z.string().max(1000).optional(),
  assigneeIds: z.array(z.string().uuid()).max(50).default([]),
  tags: z.array(z.string().trim().min(1).max(32)).max(8).default([]),
  schedule: scheduleSchema.nullable().default(null),
});

const taskUpdateSchema = taskCreateSchema.partial().extend({ version: z.number().int().positive() });
const versionSchema = z.object({ version: z.number().int().positive() });
const claimSchema = z.object({ code: z.string().trim().min(8).max(64) });

function safeMember(member: NonNullable<BrowserContext["member"]>): Member {
  const { telegramUserId: _privateId, ...safe } = member;
  return safe;
}

function withoutNotes(task: Task): Task {
  const { note: _untrustedNote, ...safe } = task;
  return safe;
}

function scheduleDate(schedule: Task["schedule"]): string | undefined {
  if (!schedule) return undefined;
  if (schedule.type === "date") return schedule.date;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: schedule.timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date(schedule.startAt))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function claimRateIdentity(initData: string): string {
  if (/^\d+$/.test(initData)) return initData;
  try {
    const rawUser = new URLSearchParams(initData).get("user");
    const id = rawUser ? String((JSON.parse(rawUser) as { id?: string | number }).id ?? "") : "";
    if (/^\d+$/.test(id)) return id;
  } catch {
    // Invalid initData is grouped by a bounded digest and rejected by authentication.
  }
  return `invalid-${createHash("sha256").update(initData).digest("hex").slice(0, 8)}`;
}

export function createApp(options: CreateAppOptions) {
  const { database, config } = options;
  const fetchImpl = options.fetchImpl ?? fetch;
  const eventBus = options.eventBus ?? new EventBus();
  const verifyIdentity =
    options.verifyIdentity ?? ((initData: string) => verifyTelegramInitData(initData, config.botToken));
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", ["loopback", "linklocal", "uniquelocal"]);
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "https://telegram.org"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'"],
          frameAncestors: ["'self'", "https://web.telegram.org", "https://*.telegram.org"],
        },
      },
      hsts: config.nodeEnv === "production" ? { maxAge: 31_536_000, includeSubDomains: true } : false,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: "32kb" }));

  const standardLimit = rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: "draft-7", legacyHeaders: false });
  const agentLimit = rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: "draft-7", legacyHeaders: false });
  const claimIpLimit = rateLimit({
    windowMs: 15 * 60_000,
    limit: 5,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  });
  const claimIdentityLimit = rateLimit({
    windowMs: 15 * 60_000,
    limit: 5,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: (request) => {
      const initData = request.header("x-telegram-init-data") ?? "anonymous";
      return claimRateIdentity(initData);
    },
  });
  app.use("/api/v1", standardLimit);
  app.use("/api/agent/v1", agentLimit);

  app.get("/health/live", (_request, response) => response.json({ ok: true }));
  app.get("/health/ready", (_request, response) => {
    try {
      database.getWorkspace();
      response.json({ ok: true });
    } catch {
      response.status(503).json({ ok: false });
    }
  });

  function verifyBrowser(request: Request): BrowserContext {
    const raw = request.header("x-telegram-init-data") ?? "";
    const identity = verifyIdentity(raw);
    return { identity, member: database.getMemberByTelegramId(identity.telegramUserId) };
  }

  function requireMember(request: Request, response: Response, next: NextFunction): void {
    try {
      const context = verifyBrowser(request);
      if (!context.member || context.member.status !== "active") {
        response.status(403).json({
          error: { code: "membership_required", message: "Join this Home with an invite code." },
        });
        return;
      }
      response.locals.browser = context;
      next();
    } catch (error) {
      next(error);
    }
  }

  function requireAdmin(_request: Request, response: Response, next: NextFunction): void {
    const context = response.locals.browser as BrowserContext;
    if (context.member?.role !== "admin") {
      response.status(403).json({ error: { code: "admin_required", message: "Administrator access is required." } });
      return;
    }
    next();
  }

  function requireAgent(scope: ApiScope) {
    return (request: Request, response: Response, next: NextFunction): void => {
      const authorization = request.header("authorization") ?? "";
      const value = parseBearerToken(authorization);
      if (!value) {
        response.status(401).json({ error: { code: "unauthorized", message: "A valid scoped API token is required." } });
        return;
      }
      const token = database.authenticateApiToken(value, scope);
      if (!token) {
        response.status(401).json({ error: { code: "unauthorized", message: "A valid scoped API token is required." } });
        return;
      }
      response.locals.agent = { id: token.id, label: token.label } satisfies AgentContext;
      next();
    };
  }

  function requireSameOrigin(request: Request, response: Response, next: NextFunction): void {
    const origin = request.header("origin");
    if (!origin || !config.publicUrl) {
      next();
      return;
    }
    try {
      if (new URL(origin).origin === new URL(config.publicUrl).origin) {
        next();
        return;
      }
    } catch {
      // Fall through to the same error response.
    }
    response.status(403).json({ error: { code: "invalid_origin", message: "Request origin is not allowed." } });
  }

  app.post("/api/v1/invites/claim", claimIpLimit, claimIdentityLimit, requireSameOrigin, (request, response, next) => {
    try {
      const identity = verifyBrowser(request).identity;
      const input = claimSchema.parse(request.body);
      const member = database.claimInvite(input.code, identity);
      eventBus.publish({ type: "member.changed", id: member.id, revision: database.getRevision() });
      response.status(201).json({ member: safeMember(member) });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/bootstrap", requireMember, (_request, response) => {
    const context = response.locals.browser as BrowserContext;
    response.json({
      workspace: database.getWorkspace(),
      viewer: safeMember(context.member!),
      members: database.listMembers(),
      tasks: database.listTasks({ includeArchived: true }),
      revision: database.getRevision(),
    });
  });

  app.get("/api/v1/events", requireMember, (request, response) => {
    response.status(200);
    response.setHeader("content-type", "text/event-stream; charset=utf-8");
    response.setHeader("cache-control", "no-cache, no-transform");
    response.setHeader("connection", "keep-alive");
    response.setHeader("content-encoding", "identity");
    response.flushHeaders();
    response.write(`event: ready\ndata: ${JSON.stringify({ revision: database.getRevision() })}\n\n`);
    const unsubscribe = eventBus.subscribe(response);
    const heartbeat = setInterval(() => response.write(": heartbeat\n\n"), 25_000);
    request.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });

  app.post("/api/v1/tasks", requireSameOrigin, requireMember, (request, response, next) => {
    try {
      const input = taskCreateSchema.parse(request.body);
      const context = response.locals.browser as BrowserContext;
      const task = database.createTask({ type: "member", id: context.member!.id }, input);
      eventBus.publish({ type: "task.changed", id: task.id, revision: database.getRevision() });
      response.status(201).json({ task });
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/v1/tasks/:id", requireSameOrigin, requireMember, (request, response, next) => {
    try {
      const { version, ...patch } = taskUpdateSchema.parse(request.body);
      const context = response.locals.browser as BrowserContext;
      const id = z.string().uuid().parse(request.params.id);
      const task = database.updateTask(id, version, { type: "member", id: context.member!.id }, patch);
      eventBus.publish({ type: "task.changed", id: task.id, revision: database.getRevision() });
      response.json({ task });
    } catch (error) {
      next(error);
    }
  });

  for (const [action, status] of [
    ["complete", "completed"],
    ["archive", "archived"],
    ["restore", "open"],
  ] as const) {
    app.post(`/api/v1/tasks/:id/${action}`, requireSameOrigin, requireMember, (request, response, next) => {
      try {
        const { version } = versionSchema.parse(request.body);
        const context = response.locals.browser as BrowserContext;
        const id = z.string().uuid().parse(request.params.id);
        const task = database.setTaskStatus(
          id,
          version,
          status,
          { type: "member", id: context.member!.id },
        );
        eventBus.publish({ type: "task.changed", id: task.id, revision: database.getRevision() });
        response.json({ task });
      } catch (error) {
        next(error);
      }
    });
  }

  app.post("/api/v1/admin/invites", requireSameOrigin, requireMember, requireAdmin, (request, response, next) => {
    try {
      const input = z
        .object({ role: z.enum(["admin", "member"]).default("member"), expiresInHours: z.number().min(1).max(168).default(24) })
        .parse(request.body);
      const context = response.locals.browser as BrowserContext;
      const invite = database.createInvite(
        { type: "member", id: context.member!.id },
        { role: input.role, expiresAt: new Date(Date.now() + input.expiresInHours * 3_600_000).toISOString() },
      );
      response.status(201).json({ invite });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/members", requireMember, requireAdmin, (_request, response) => {
    response.json({ members: database.listAdminMembers().map(safeMember) });
  });

  app.patch("/api/v1/admin/members/:id", requireSameOrigin, requireMember, requireAdmin, (request, response, next) => {
    try {
      const { status } = z.object({ status: z.enum(["active", "disabled"]) }).parse(request.body);
      const context = response.locals.browser as BrowserContext;
      const id = z.string().uuid().parse(request.params.id);
      const member = database.setMemberStatus(id, status, { type: "member", id: context.member!.id });
      eventBus.publish({ type: "member.changed", id: member.id, revision: database.getRevision() });
      response.json({ member: safeMember(member) });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/invites", requireMember, requireAdmin, (_request, response) => {
    response.json({ invites: database.listInvites() });
  });

  app.delete("/api/v1/admin/invites/:id", requireSameOrigin, requireMember, requireAdmin, (request, response, next) => {
    try {
      const context = response.locals.browser as BrowserContext;
      const id = z.string().uuid().parse(request.params.id);
      database.revokeInvite(id, { type: "member", id: context.member!.id });
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/tokens", requireSameOrigin, requireMember, requireAdmin, (request, response, next) => {
    try {
      const input = z
        .object({
          label: z.string().trim().min(1).max(80),
          scopes: z.array(z.enum(["tasks:read", "tasks:write", "calendar:sync"])).min(1),
        })
        .parse(request.body);
      const context = response.locals.browser as BrowserContext;
      const token = database.createApiToken({ type: "member", id: context.member!.id }, input);
      response.status(201).json({ token });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/tokens", requireMember, requireAdmin, (_request, response) => {
    response.json({ tokens: database.listApiTokens() });
  });

  app.delete("/api/v1/admin/tokens/:id", requireSameOrigin, requireMember, requireAdmin, (request, response, next) => {
    try {
      const context = response.locals.browser as BrowserContext;
      const id = z.string().uuid().parse(request.params.id);
      database.revokeApiToken(id, { type: "member", id: context.member!.id });
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/v1/admin/tasks/:id", requireSameOrigin, requireMember, requireAdmin, (request, response, next) => {
    try {
      const { version } = z
        .object({ version: z.number().int().positive(), confirmation: z.literal("DELETE") })
        .parse(request.body);
      const context = response.locals.browser as BrowserContext;
      const id = z.string().uuid().parse(request.params.id);
      database.permanentlyDeleteArchivedTask(id, version, { type: "member", id: context.member!.id });
      eventBus.publish({ type: "task.changed", id, revision: database.getRevision() });
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/integrations/google", requireMember, requireAdmin, (_request, response) => {
    const connection = database.getGoogleConnection();
    response.json({
      integration: connection
        ? {
            status: connection.status,
            ...(connection.accountEmail ? { accountEmail: connection.accountEmail } : {}),
            ...(connection.calendarId ? { calendarId: connection.calendarId } : {}),
            updatedAt: connection.updatedAt,
          }
        : { status: "disconnected" },
    });
  });

  app.post("/api/v1/admin/integrations/google/connect", requireSameOrigin, requireMember, requireAdmin, (request, response, next) => {
    try {
      if (!config.masterKeyPath || !config.publicUrl) {
        response.status(503).json({ error: { code: "integration_unavailable", message: "Google Calendar is not configured." } });
        return;
      }
      const { clientId, clientSecret } = z
        .object({ clientId: z.string().trim().min(10).max(300), clientSecret: z.string().trim().min(6).max(300) })
        .parse(request.body);
      const context = response.locals.browser as BrowserContext;
      const pkce = createGooglePkce();
      const redirectUri = `${config.publicUrl}/api/v1/admin/integrations/google/callback`;
      database.saveGoogleConnection({
        status: "pending",
        encryptedConfig: encryptGoogleConfig(
          { clientId, clientSecret, redirectUri, state: pkce.state, verifier: pkce.verifier, adminId: context.member!.id },
          config.masterKeyPath,
        ),
      });
      response.json({ authorizationUrl: buildGoogleAuthorizationUrl({ clientId, redirectUri, state: pkce.state, challenge: pkce.challenge }) });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/integrations/google/callback", async (request, response, next) => {
    try {
      if (!config.masterKeyPath) throw new DatabaseValidationError("Google Calendar is not configured");
      const { code, state } = z.object({ code: z.string().min(1), state: z.string().min(20) }).parse(request.query);
      const connection = database.getGoogleConnection();
      if (!connection || connection.status !== "pending") throw new DatabaseValidationError("No pending Google connection");
      const pending = decryptGoogleConfig<{
        clientId: string;
        clientSecret: string;
        redirectUri: string;
        state: string;
        verifier: string;
        adminId: string;
      }>(connection.encryptedConfig, config.masterKeyPath);
      if (pending.state !== state) throw new DatabaseValidationError("OAuth state mismatch");
      const tokenResponse = await fetchImpl("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: pending.clientId,
          client_secret: pending.clientSecret,
          redirect_uri: pending.redirectUri,
          grant_type: "authorization_code",
          code_verifier: pending.verifier,
        }),
      });
      const token = (await tokenResponse.json()) as { access_token?: string; refresh_token?: string; expires_in?: number; error?: string };
      if (!tokenResponse.ok || !token.access_token || !token.refresh_token) {
        throw new Error(`Google token exchange failed: ${token.error ?? tokenResponse.status}`);
      }
      const calendarResponse = await fetchImpl("https://www.googleapis.com/calendar/v3/calendars", {
        method: "POST",
        headers: { authorization: `Bearer ${token.access_token}`, "content-type": "application/json" },
        body: JSON.stringify({ summary: "Hermes Todo", description: "Tasks managed by Hermes Todo" }),
      });
      const calendar = (await calendarResponse.json()) as { id?: string; error?: { message?: string } };
      if (!calendarResponse.ok || !calendar.id) {
        throw new Error(`Dedicated calendar creation failed: ${calendar.error?.message ?? calendarResponse.status}`);
      }
      database.saveGoogleConnection({
        status: "active",
        calendarId: calendar.id,
        encryptedConfig: encryptGoogleConfig(
          { clientId: pending.clientId, clientSecret: pending.clientSecret, refreshToken: token.refresh_token },
          config.masterKeyPath,
        ),
      });
      database.sqlite
        .prepare("INSERT INTO audit_events(id, actor_type, actor_id, action, target_type, target_id, created_at) VALUES(?, 'member', ?, 'google.connected', 'google_connection', ?, ?)")
        .run(randomUUID(), pending.adminId, connection.id, new Date().toISOString());
      response.redirect(303, "/?google=connected");
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/v1/admin/integrations/google", requireSameOrigin, requireMember, requireAdmin, (request, response) => {
    const context = response.locals.browser as BrowserContext;
    database.removeGoogleConnection({ type: "member", id: context.member!.id });
    response.status(204).end();
  });

  app.get("/api/agent/v1/members", requireAgent("tasks:read"), (_request, response) => {
    response.json({ workspace: database.getWorkspace(), members: database.listMembers(), revision: database.getRevision() });
  });

  app.get("/api/agent/v1/tasks", requireAgent("tasks:read"), (request, response) => {
    const includeNotes = request.query.include_notes === "true";
    const status = z.enum(["open", "completed", "archived", "all"]).default("open").parse(request.query.status);
    const date = z.string().date().optional().parse(request.query.date);
    const assignee = z.string().trim().min(1).optional().parse(request.query.assignee);
    const memberId = assignee
      ? database
          .listMembers()
          .find((member) => member.id === assignee || member.displayName.toLocaleLowerCase() === assignee.toLocaleLowerCase())
          ?.id
      : undefined;
    const tasks = database
      .listTasks({ includeArchived: status === "archived" || status === "all" })
      .filter((task) => status === "all" || task.status === status)
      .filter((task) => !assignee || (memberId !== undefined && task.assigneeIds.includes(memberId)))
      .filter((task) => {
        if (!date) return true;
        if (!task.schedule) return false;
        return scheduleDate(task.schedule) === date;
      })
      .map((task) => (includeNotes ? task : withoutNotes(task)));
    response.json({
      workspace: database.getWorkspace(),
      tasks,
      revision: database.getRevision(),
      untrustedContent: true,
    });
  });

  app.post("/api/agent/v1/tasks", requireAgent("tasks:write"), (request, response, next) => {
    try {
      const input = taskCreateSchema.parse(request.body);
      const agent = response.locals.agent as AgentContext;
      const task = database.createTask({ type: "integration", id: agent.id }, input);
      eventBus.publish({ type: "task.changed", id: task.id, revision: database.getRevision() });
      response.status(201).json({ task });
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/agent/v1/tasks/:id", requireAgent("tasks:write"), (request, response, next) => {
    try {
      const { version, ...patch } = taskUpdateSchema.parse(request.body);
      const agent = response.locals.agent as AgentContext;
      const id = z.string().uuid().parse(request.params.id);
      const task = database.updateTask(id, version, { type: "integration", id: agent.id }, patch);
      eventBus.publish({ type: "task.changed", id: task.id, revision: database.getRevision() });
      response.json({ task });
    } catch (error) {
      next(error);
    }
  });

  for (const [action, status] of [
    ["complete", "completed"],
    ["archive", "archived"],
  ] as const) {
    app.post(`/api/agent/v1/tasks/:id/${action}`, requireAgent("tasks:write"), (request, response, next) => {
      try {
        const { version } = versionSchema.parse(request.body);
        const agent = response.locals.agent as AgentContext;
        const id = z.string().uuid().parse(request.params.id);
        const task = database.setTaskStatus(
          id,
          version,
          status,
          { type: "integration", id: agent.id } satisfies Actor,
        );
        eventBus.publish({ type: "task.changed", id: task.id, revision: database.getRevision() });
        response.json({ task });
      } catch (error) {
        next(error);
      }
    });
  }

  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    if (error instanceof z.ZodError || error instanceof DatabaseValidationError) {
      response.status(400).json({ error: { code: "invalid_request", message: "The request is not valid." } });
      return;
    }
    if (error instanceof TelegramAuthError) {
      response.status(401).json({ error: { code: "unauthorized", message: "Telegram authentication failed." } });
      return;
    }
    if (error instanceof DatabaseNotFoundError) {
      response.status(404).json({ error: { code: "not_found", message: "The requested resource was not found." } });
      return;
    }
    if (error instanceof DatabaseConflictError) {
      response.status(409).json({
        error: { code: "version_conflict", message: "This task changed elsewhere. Refresh and try again." },
      });
      return;
    }
    if (config.nodeEnv !== "test") console.error("Request failed", error instanceof Error ? error.message : "unknown");
    response.status(500).json({ error: { code: "internal_error", message: "The request could not be completed." } });
  });

  return app;
}
