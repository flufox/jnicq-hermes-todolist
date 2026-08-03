<div align="center">

<p><strong>Documentation:</strong> <a href="README.ru.md">Русский</a> · <a href="README.md">English</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.kk.md">Қазақша</a> · <a href="README.th.md">ไทย</a> · <a href="README.id.md">Bahasa Indonesia</a></p>

<h1>Hermes Todo</h1>
<p><strong>Turn every Hermes conversation into a shared plan.</strong></p>
<p>Send Hermes a message or a voice note. Tasks, people, and dates appear in one simple calendar that everyone can see and update together.</p>
<p><a href="#from-conversation-to-action">See how it works</a> · <a href="#try-it-locally">Try the demo</a> · <a href="#install-for-real">Install with Docker</a></p>
<p>
  <a href="https://github.com/flufox/jnicq-hermes-todolist/actions/workflows/ci.yml"><img src="https://github.com/flufox/jnicq-hermes-todolist/actions/workflows/ci.yml/badge.svg" alt="CI status" /></a>
  <a href="https://github.com/flufox/jnicq-hermes-todolist/actions/workflows/security.yml"><img src="https://github.com/flufox/jnicq-hermes-todolist/actions/workflows/security.yml/badge.svg" alt="Security checks status" /></a>
  <a href="CHANGELOG.md"><img src="https://img.shields.io/badge/status-v0.1.0--rc-c65b4b" alt="v0.1.0 release candidate" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-252826" alt="MIT license" /></a>
</p>

</div>

<a href="docs/assets/desktop-overview.png">
  <img src="docs/assets/desktop-overview.png" alt="Hermes Todo shared two-week plan with scheduled tasks, assignees, and a backlog" />
</a>

Plans are often made in conversation and then disappear in conversation. Someone has to remember the date, copy the task into another app, and tell everyone when it changes.

Hermes Todo closes that gap. Tell [Hermes Agent](https://github.com/NousResearch/hermes-agent) what needs to happen once. The request becomes a task in a shared calendar where your family, housemates, or small team can assign it, reschedule it, and complete it together.

> Hermes Todo is a community project. It is not affiliated with or endorsed by Nous Research or Telegram.

## From conversation to action

> 🎙️ **“Hermes, add groceries for Thursday at 18:00 and assign Alex and Maya.”**

<table>
  <tr>
    <td width="33%"><strong>1. Say it naturally</strong><br /><br />Use text or audio in a channel supported by Hermes Agent. No task form to fill in.</td>
    <td width="33%"><strong>2. Hermes structures it</strong><br /><br />The Hermes Todo plugin turns the request into a task with a date, time, tags, and assignees.</td>
    <td width="33%"><strong>3. Everyone sees it</strong><br /><br />The shared Telegram Mini App refreshes and keeps the current plan visible to every participant.</td>
  </tr>
</table>

Hermes Agent handles the conversation and audio. Hermes Todo is the visual shared workspace that receives the structured result through the plugin.

## One place for every shared task

- **See the plan at a glance.** Switch between 1–7 days, two weeks, or four weeks.
- **Know who owns what.** Assign one task to one or several participants.
- **Open the whole day.** A double tap or **Open day** shows every task for that date.
- **Change plans naturally.** Hold a task and drag it onto another day with a finger or mouse.
- **Keep the details useful.** Add notes, tags, all-day dates, or exact start and end times.
- **Stay in sync.** Changes from Hermes sessions and other Mini App clients appear in the shared view.
- **Keep control of the data.** The app is self-hosted, uses recoverable archives, and stores tasks on your server.

## See the app

<table>
  <tr>
    <th width="50%">The week at a glance</th>
    <th width="50%">The complete day plan</th>
  </tr>
  <tr>
    <td><a href="docs/assets/mobile-calendar.png"><img src="docs/assets/mobile-calendar.png" alt="Seven-day Hermes Todo mobile calendar with shared tasks and several assignees" /></a></td>
    <td><a href="docs/assets/mobile-day-plan.png"><img src="docs/assets/mobile-day-plan.png" alt="Hermes Todo day sheet showing all tasks for Thursday" /></a></td>
  </tr>
  <tr>
    <td><strong>Pick a day with one tap; open its full list with two.</strong></td>
    <td><strong>See the whole day, ordered by all-day and timed tasks.</strong></td>
  </tr>
</table>

<table>
  <tr>
    <th width="50%">Move a task without reopening it</th>
    <th width="50%">Make every task precise</th>
  </tr>
  <tr>
    <td><a href="docs/assets/mobile-drag-task.png"><img src="docs/assets/mobile-drag-task.png" alt="A Hermes Todo task being dragged upward onto another calendar day" /></a></td>
    <td><a href="docs/assets/mobile-task-editor.png"><img src="docs/assets/mobile-task-editor.png" alt="Hermes Todo task editor with 24-hour time, tags, notes, and multiple assignees" /></a></td>
  </tr>
  <tr>
    <td><strong>Hold, drag, release. The task keeps its details on the new date.</strong></td>
    <td><strong>Use 24-hour time by default or switch to AM/PM in Settings.</strong></td>
  </tr>
</table>

<table>
  <tr>
    <th width="50%">A plan for several people</th>
    <th width="50%">Done does not mean lost</th>
  </tr>
  <tr>
    <td><a href="docs/assets/mobile-team-settings.png"><img src="docs/assets/mobile-team-settings.png" alt="Hermes Todo settings with three members, invite controls, time format, and Google Calendar" /></a></td>
    <td><a href="docs/assets/mobile-completed.png"><img src="docs/assets/mobile-completed.png" alt="Hermes Todo completed task list with recoverable items" /></a></td>
  </tr>
  <tr>
    <td><strong>Invite participants and give everyone the same source of truth.</strong></td>
    <td><strong>Completed and archived work stays visible and recoverable.</strong></td>
  </tr>
</table>

## Try it locally

This is the fastest way to understand the product. It needs Node.js 22+, but no Telegram bot, domain, Docker, or production secrets.

```bash
git clone https://github.com/flufox/jnicq-hermes-todolist.git
cd jnicq-hermes-todolist
npm ci
npm run dev:demo
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). You should see a local workspace with synthetic tasks. The demo is intentionally restricted to loopback and must not be exposed to a network.

### Using a coding agent?

Paste this prompt into your coding tool:

> Clone `flufox/jnicq-hermes-todolist`, run the loopback-only demo, and explain the project structure before editing. Never read or place secrets in prompts or commits. Make one narrow change, then run the tests, production build, and release scan.

After a change, ask it to run:

```bash
npm test
npm run test:python
npm run build
npm run release:scan
```

## Install for real

The guided setup is the recommended path for the first installation.

### Before you start

You need:

- a Linux server with Git, Docker Engine, and Docker Compose v2;
- a domain whose DNS points to that server;
- ports 80 and 443 open when using the recommended Caddy mode;
- a Telegram account and a new bot token from [BotFather](https://t.me/BotFather);
- Hermes Agent 0.16.x only if you want tasks to come from Hermes conversations.

### 1. Create the Telegram bot

Open [BotFather](https://t.me/BotFather), send `/newbot`, follow its prompts, and keep the resulting token nearby. Do not commit or paste that token into an issue.

### 2. Run the guided setup

```bash
git clone https://github.com/flufox/jnicq-hermes-todolist.git
cd jnicq-hermes-todolist
chmod +x hermes-todo
./hermes-todo setup
```

For the simplest deployment, choose `caddy` when asked for the proxy mode. The setup will ask for your domain, ACME email, timezone, language, workspace name, and Telegram bot token. It then:

- validates Docker Compose and the bot token;
- creates private secret files and the local database;
- starts the containers and waits for their health checks;
- connects the bot menu button to the Mini App;
- prints a one-time admin invite that expires in 30 minutes.

### 3. Open your workspace

Open the bot in Telegram, tap its menu button, and enter the printed admin invite. The shared calendar should appear. Invite the other participants later from **Settings → Members**.

If the app does not become healthy, run:

```bash
./hermes-todo doctor
```

### 4. Connect Hermes Agent (optional)

This is the step that enables the `message/audio → shared task` flow. If setup detected a local Hermes 0.16.x installation and you accepted its plugin prompt, skip this step.

Otherwise, securely copy the value from `secrets/hermes_agent_token` to the machine where Hermes runs, then run:

```bash
hermes plugins install https://github.com/flufox/jnicq-hermes-todolist.git --enable
hermes gateway restart
```

The installer asks for two values and saves them in Hermes' private environment file:

- `HERMES_TODO_API_URL`: your public origin, for example `https://todo.example.com` — do not add `/api/agent/v1`;
- `HERMES_TODO_API_TOKEN`: the copied scoped token; the prompt is masked.

Do not export these values only for one shell session: the gateway must still have them after a restart. Outside the masked installer field, do not put the token in shell history, AI chats, issues, or the repository.

Test the connection with a harmless request such as:

> “Hermes, add ‘Check Hermes Todo’ for tomorrow at 10:00.”

The task should appear in the Mini App. The setup script never installs Hermes itself; plugin installation follows the [official Hermes plugin flow](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/plugins.md).

## What is ready in the v0.1.0 release candidate

`v0.1.0` is the debut public release candidate. The core shared-task flow is implemented and locally tested; the final release tag waits for the documented Docker runtime and real Telegram/Hermes smoke checks. Feedback, bug reports, and first contributions are welcome now.

- one shared workspace with admin and member roles;
- task creation, editing, completion, recovery, and archive;
- multiple assignees, tags, notes, all-day and timed schedules;
- 1–7 day, two-week, and four-week calendar ranges;
- double-tap day view and touch/mouse drag-to-reschedule;
- live refresh between Hermes and Mini App sessions;
- 24-hour time by default with an AM/PM preference;
- one-time invites and scoped, revocable agent tokens;
- optional two-way sync with a dedicated Google Calendar;
- encrypted portable backup and integrity-checked restore;
- English and Russian interfaces.

The first release is deliberately focused: one instance serves one small shared group and one application replica. Telegram is the production sign-in method. There is no built-in microphone, SaaS, multitenancy, or automatic conflict winner for Google Calendar. See the [roadmap](ROADMAP.md) for what may come next.

## Privacy and recovery

Task contents are plaintext inside the protected SQLite database, so use full-disk encryption, encrypted off-site backups, OS updates, and a trusted TLS proxy. The application and workers run as a non-root user with a read-only root filesystem, all capabilities dropped, and `no-new-privileges`; Caddy retains only `NET_BIND_SERVICE` for its listener ports.

Hermes receives task notes only when a tool call explicitly asks for them. Its API cannot hard-delete tasks or change workspace, OAuth, or synchronization settings. Read the [security policy](SECURITY.md), [threat model](docs/THREAT_MODEL.md), and [latest security review](docs/SECURITY_REVIEW.md) before publishing an instance.

<details>
<summary><strong>Advanced setup and operations</strong></summary>

### Proxy modes

The recommended `caddy` profile publishes ports 80/443 and obtains HTTPS certificates automatically. Choose `external` during setup if another reverse proxy already terminates TLS; Hermes Todo then binds only to `127.0.0.1:3000`.

Remote Hermes installations must use the public HTTPS Agent API. Plain HTTP is suitable only for loopback development.

### Google Calendar

1. In [Google Cloud](https://support.google.com/cloud/answer/15549257), enable the Google Calendar API, configure the OAuth consent screen, and create an OAuth client of type **Web application**.
2. Add this exact authorized redirect URI, replacing the domain:

   ```text
   https://todo.example.com/api/v1/admin/integrations/google/callback
   ```

3. Edit `.env` so the calendar profile stays enabled during future updates: use `COMPOSE_PROFILES=caddy,calendar` or `COMPOSE_PROFILES=external-proxy,calendar`.
4. Start the worker, open **Settings → Google Calendar**, enter the client ID and secret, and connect the account:

```bash
docker compose up -d --wait
```

Hermes Todo creates and uses a dedicated calendar. OAuth refresh credentials are encrypted with AES-256-GCM. Concurrent edits are marked `needs_attention`; neither side silently wins.

### Day-to-day commands

```bash
./hermes-todo doctor
./hermes-todo invite-member
./hermes-todo rotate-token
./hermes-todo backup
./hermes-todo backup --portable
./hermes-todo restore --archive backups/example.htbackup
./hermes-todo update
```

The backup service keeps seven daily and four weekly SQLite snapshots. Portable backups include the database and required master key in a passphrase-encrypted AES-256-GCM envelope.

### Main configuration

Non-secret values live in `.env`. The Telegram token, database master key, and Hermes Agent token live only in owner-readable files under `secrets/`.

| Variable | Purpose | Default |
| --- | --- | --- |
| `HERMES_TODO_DOMAIN` | Public hostname | required |
| `HERMES_TODO_TIMEZONE` | IANA workspace timezone | `UTC` |
| `HERMES_TODO_LOCALE` | Workspace locale recorded at setup; each client can choose its UI language | `en` |
| `COMPOSE_PROFILES` | `caddy` or `external-proxy`; optionally add `calendar` | `caddy` |
| `HERMES_TODO_CALENDAR_POLL_MS` | Calendar polling interval | `30000` |

</details>

## Build and contribute

The stack is intentionally small: React/Vite, Express 5, SQLite, a Python Hermes plugin, Docker Compose, and an optional Google Calendar worker. Start with [CONTRIBUTING.md](CONTRIBUTING.md), then use:

```bash
npm ci
npm test
npm run test:python
npm run build
npm run dev:demo
```

Architecture and API details live in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and the [OpenAPI 3.1 contract](docs/openapi-agent.yaml). Release history is in [CHANGELOG.md](CHANGELOG.md), and community expectations are in the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE)
