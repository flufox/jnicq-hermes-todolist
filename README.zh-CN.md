<div align="center">

<p><strong>文档语言：</strong> <a href="README.ru.md">Русский</a> · <a href="README.md">English</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.kk.md">Қазақша</a> · <a href="README.th.md">ไทย</a> · <a href="README.id.md">Bahasa Indonesia</a></p>

<h1>Hermes Todo</h1>
<p><strong>把每一次与 Hermes 的对话，变成所有人都能执行的共同计划。</strong></p>
<p>给 Hermes 发送文字或语音消息，任务、负责人和日期就会出现在一个简单的共享日历中。每位参与者都能查看并一起更新。</p>
<p><a href="#从对话到行动">了解工作方式</a> · <a href="#在本机体验">运行演示</a> · <a href="#正式安装">使用 Docker 安装</a></p>
<p>
  <a href="https://github.com/flufox/jnicq-hermes-todolist/actions/workflows/ci.yml"><img src="https://github.com/flufox/jnicq-hermes-todolist/actions/workflows/ci.yml/badge.svg" alt="CI 状态" /></a>
  <a href="https://github.com/flufox/jnicq-hermes-todolist/actions/workflows/security.yml"><img src="https://github.com/flufox/jnicq-hermes-todolist/actions/workflows/security.yml/badge.svg" alt="安全检查状态" /></a>
  <a href="CHANGELOG.md"><img src="https://img.shields.io/badge/status-v0.1.0--rc-c65b4b" alt="v0.1.0 候选版本" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-252826" alt="MIT 许可证" /></a>
</p>

</div>

<a href="docs/assets/desktop-overview.png">
  <img src="docs/assets/desktop-overview.png" alt="Hermes Todo 双周共享计划，包含任务、负责人和待办区" />
</a>

计划常常在聊天中产生，也常常消失在聊天中。总得有人记住日期、把事项复制到另一个应用，再逐个通知其他人发生了什么变化。

Hermes Todo 补上了这段断层。你只需向 [Hermes Agent](https://github.com/NousResearch/hermes-agent) 说一次要做什么，它就会成为共享日历中的任务。家人、室友或小团队可以一起分配负责人、调整日期并完成任务。

> Hermes Todo 是社区项目，与 Nous Research 或 Telegram 没有关联，也未获得它们的官方认可。

## 从对话到行动

> 🎙️ **“Hermes，把买菜安排到周四 18:00，并分配给 Alex 和 Maya。”**

<table>
  <tr>
    <td width="33%"><strong>1. 自然表达</strong><br /><br />在 Hermes Agent 支持的渠道中发送文字或语音，不必填写任务表单。</td>
    <td width="33%"><strong>2. Hermes 自动整理</strong><br /><br />Hermes Todo 插件将请求转换为带日期、时间、标签和负责人的任务。</td>
    <td width="33%"><strong>3. 所有人都能看到</strong><br /><br />共享 Telegram Mini App 自动刷新，让每位参与者看到同一份最新计划。</td>
  </tr>
</table>

Hermes Agent 负责对话和语音处理；Hermes Todo 是接收插件结构化结果的可视化共享工作区。

## 所有共同事务，一个地方管理

- **一眼查看计划。** 可切换 1–7 天、两周或四周视图。
- **明确每件事由谁负责。** 一个任务可以分配给一位或多位成员。
- **查看某天的完整列表。** 双击日期或点击 **打开当天**，即可看到该日全部任务。
- **自然调整计划。** 长按任务，用手指或鼠标拖到另一天。
- **保留真正有用的细节。** 添加备注、标签、全天日期或精确的开始和结束时间。
- **所有人保持同步。** Hermes 会话和其他 Mini App 客户端的修改会出现在共享视图中。
- **数据由你掌控。** 应用自行托管，任务存储在你的服务器上，并支持可恢复备份。

## 界面预览

<table>
  <tr><th width="50%">一眼看清一周</th><th width="50%">完整的当日计划</th></tr>
  <tr>
    <td><a href="docs/assets/mobile-calendar.png"><img src="docs/assets/mobile-calendar.png" alt="Hermes Todo 七日移动日历，显示共享任务和多位负责人" /></a></td>
    <td><a href="docs/assets/mobile-day-plan.png"><img src="docs/assets/mobile-day-plan.png" alt="Hermes Todo 当日面板，显示周四的全部任务" /></a></td>
  </tr>
  <tr><td><strong>单击选择日期，双击打开完整列表。</strong></td><td><strong>全天任务和定时任务按顺序集中显示。</strong></td></tr>
</table>

<table>
  <tr><th width="50%">无需重新编辑即可移动任务</th><th width="50%">让每项任务足够准确</th></tr>
  <tr>
    <td><a href="docs/assets/mobile-drag-task.png"><img src="docs/assets/mobile-drag-task.png" alt="将 Hermes Todo 任务向上拖动到另一个日期" /></a></td>
    <td><a href="docs/assets/mobile-task-editor.png"><img src="docs/assets/mobile-task-editor.png" alt="Hermes Todo 任务编辑器，包含 24 小时时间、标签、备注和多人分配" /></a></td>
  </tr>
  <tr><td><strong>长按、拖动、松开，任务详情会原样保留。</strong></td><td><strong>默认使用 24 小时制，也可在设置中切换为 AM/PM。</strong></td></tr>
</table>

<table>
  <tr><th width="50%">多人共享一份计划</th><th width="50%">完成不等于丢失</th></tr>
  <tr>
    <td><a href="docs/assets/mobile-team-settings.png"><img src="docs/assets/mobile-team-settings.png" alt="Hermes Todo 设置，包含三位成员、邀请、时间格式和 Google Calendar" /></a></td>
    <td><a href="docs/assets/mobile-completed.png"><img src="docs/assets/mobile-completed.png" alt="Hermes Todo 已完成任务列表，可恢复任务" /></a></td>
  </tr>
  <tr><td><strong>邀请成员，让所有人以同一份计划为准。</strong></td><td><strong>已完成和已归档的工作仍可查看和恢复。</strong></td></tr>
</table>

## 在本机体验

这是理解产品最快的方法。只需 Node.js 22+，不需要 Telegram 机器人、域名、Docker 或生产密钥。

```bash
git clone https://github.com/flufox/jnicq-hermes-todolist.git
cd jnicq-hermes-todolist
npm ci
npm run dev:demo
```

打开 [http://127.0.0.1:5173](http://127.0.0.1:5173)。你会看到带有模拟任务的本地工作区。演示模式只绑定回环地址，请勿将其暴露到网络。

### 使用编程智能体？

把下面的提示词交给你的编程工具：

> 克隆 `flufox/jnicq-hermes-todolist`，运行仅绑定回环地址的演示，并在修改前解释项目结构。不要读取密钥，也不要把密钥放进提示词或提交。只做一个范围明确的改动，然后运行测试、生产构建和发布扫描。

修改后让它运行：

```bash
npm test
npm run test:python
npm run build
npm run release:scan
```

## 正式安装

首次部署建议使用交互式安装程序。

### 准备条件

- 一台安装了 Git、Docker Engine 和 Docker Compose v2 的 Linux 服务器；
- 一个 DNS 已指向该服务器的域名；
- 使用推荐的 Caddy 模式时，开放 80 和 443 端口；
- Telegram 账号，以及从 [BotFather](https://t.me/BotFather) 创建的新机器人令牌；
- 仅当任务需要来自 Hermes 对话时，才需要 Hermes Agent 0.16.x。

### 1. 创建 Telegram 机器人

打开 [BotFather](https://t.me/BotFather)，发送 `/newbot` 并按提示操作。妥善保存令牌，不要把它提交到仓库或粘贴到 Issue 中。

### 2. 运行安装程序

```bash
git clone https://github.com/flufox/jnicq-hermes-todolist.git
cd jnicq-hermes-todolist
chmod +x hermes-todo
./hermes-todo setup
```

代理模式请选择最简单的 `caddy`。安装程序会询问域名、ACME 邮箱、时区、语言、工作区名称和 Telegram 机器人令牌，随后会：

- 验证 Docker Compose 和机器人令牌；
- 创建私有密钥文件和本地数据库；
- 启动容器并等待健康检查通过；
- 将机器人菜单按钮连接到 Mini App；
- 输出一个 30 分钟后过期的一次性管理员邀请。

### 3. 打开工作区

在 Telegram 中打开机器人，点击菜单按钮并输入安装程序输出的管理员邀请。共享日历随后会出现。可在 **设置 → 成员** 中邀请其他参与者。

如果应用未进入健康状态，请运行：

```bash
./hermes-todo doctor
```

### 4. 连接 Hermes Agent（可选）

此步骤会启用“文字/语音 → 共享任务”的流程。如果安装程序检测到本机 Hermes 0.16.x，并且你同意安装插件，可以跳过。

否则，将 `secrets/hermes_agent_token` 的值安全复制到运行 Hermes 的机器，然后执行：

```bash
hermes plugins install https://github.com/flufox/jnicq-hermes-todolist.git --enable
hermes gateway restart
```

安装程序会要求输入两个值，并保存在 Hermes 的私有环境文件中：

- `HERMES_TODO_API_URL`：公开源地址，例如 `https://todo.example.com`，不要添加 `/api/agent/v1`；
- `HERMES_TODO_API_TOKEN`：刚才复制的受限令牌，输入内容会被隐藏。

不要只在当前 shell 中临时 `export`，重启 gateway 后这些值仍需存在。除安装程序的隐藏输入框外，不要把令牌放进 shell 历史、AI 对话、Issue 或仓库。

用无害请求测试连接：

> “Hermes，把‘检查 Hermes Todo’安排到明天 10:00。”

任务应出现在 Mini App 中。安装脚本不会安装 Hermes 本身；插件安装遵循 [Hermes 官方插件流程](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/plugins.md)。

## v0.1.0 候选版本包含什么

`v0.1.0` 是首次公开候选版本。共享任务的核心流程已经实现并完成本地测试；最终标签仍等待真实 Docker 运行环境以及 Telegram/Hermes 联调检查。现在已经欢迎反馈、错误报告和首次贡献。

- 单个共享工作区，包含管理员和成员角色；
- 创建、编辑、完成、恢复和归档任务；
- 多负责人、标签、备注、全天和定时安排；
- 1–7 天、两周和四周日历范围；
- 双击打开完整日期视图，并支持触摸/鼠标拖动改期；
- Hermes 与 Mini App 会话之间实时刷新；
- 默认 24 小时制，可选择 AM/PM；
- 一次性邀请和可撤销的受限智能体令牌；
- 可选的独立 Google Calendar 双向同步；
- 加密的便携备份以及带完整性检查的恢复；
- 英文和俄文界面。

首个版本有意保持聚焦：一个实例服务一个小型共享群组，并只运行一个应用副本。生产环境通过 Telegram 登录。项目不内置麦克风、SaaS、多租户，也不会自动决定 Google Calendar 冲突的胜方。后续方向见 [路线图](ROADMAP.md)。

## 隐私与恢复

任务内容以明文形式存储在受保护的 SQLite 数据库中。请使用全盘加密、加密的异地备份、及时的系统更新和可信 TLS 代理。应用和 worker 以非 root 用户运行，根文件系统只读，所有 capabilities 均被移除，并启用 `no-new-privileges`；Caddy 仅保留监听端口需要的 `NET_BIND_SERVICE`。

只有工具调用明确请求时，Hermes 才会收到任务备注。智能体 API 不能永久删除任务，也不能更改工作区、OAuth 或同步设置。公开实例前，请阅读[安全策略](SECURITY.md)、[威胁模型](docs/THREAT_MODEL.md)和[最新安全审查](docs/SECURITY_REVIEW.md)。

<details>
<summary><strong>高级配置与运维</strong></summary>

### 代理模式

推荐的 `caddy` 配置会开放 80/443 端口并自动获取 HTTPS 证书。如果已有反向代理负责 TLS，请选择 `external`；Hermes Todo 将只监听 `127.0.0.1:3000`。远程 Hermes 必须通过公开 HTTPS 访问 Agent API，普通 HTTP 仅适用于回环开发。

### Google Calendar

1. 在 [Google Cloud](https://support.google.com/cloud/answer/15549257) 中启用 Google Calendar API，配置 OAuth 同意屏幕，并创建 **Web application** 类型的 OAuth 客户端。
2. 添加以下授权回调地址，并替换域名：

   ```text
   https://todo.example.com/api/v1/admin/integrations/google/callback
   ```

3. 编辑 `.env`，使用 `COMPOSE_PROFILES=caddy,calendar` 或 `COMPOSE_PROFILES=external-proxy,calendar`，确保更新后仍启用日历配置。
4. 启动 worker，在 **设置 → Google Calendar** 中输入 client ID 和 secret 并连接账号：

```bash
docker compose up -d --wait
```

Hermes Todo 会创建并只使用一个独立日历。OAuth 刷新凭据使用 AES-256-GCM 加密。并发修改会标记为 `needs_attention`，系统不会悄悄选择某一方覆盖另一方。

### 日常命令

```bash
./hermes-todo doctor
./hermes-todo invite-member
./hermes-todo rotate-token
./hermes-todo backup
./hermes-todo backup --portable
./hermes-todo restore --archive backups/example.htbackup
./hermes-todo update
```

备份服务保留 7 个每日和 4 个每周 SQLite 快照。便携备份把数据库和所需主密钥放进由口令保护的 AES-256-GCM 容器。

### 主要配置

非敏感值位于 `.env`。Telegram 令牌、数据库主密钥和 Hermes Agent 令牌只存放在 `secrets/` 下仅所有者可读的文件中。

| 变量 | 用途 | 默认值 |
| --- | --- | --- |
| `HERMES_TODO_DOMAIN` | 公开主机名 | 必填 |
| `HERMES_TODO_TIMEZONE` | 工作区 IANA 时区 | `UTC` |
| `HERMES_TODO_LOCALE` | 安装时记录的工作区区域；每个客户端可自行选择界面语言 | `en` |
| `COMPOSE_PROFILES` | `caddy` 或 `external-proxy`；可添加 `calendar` | `caddy` |
| `HERMES_TODO_CALENDAR_POLL_MS` | 日历轮询间隔 | `30000` |

</details>

## 构建与贡献

技术栈刻意保持精简：React/Vite、Express 5、SQLite、Python Hermes 插件、Docker Compose，以及可选的 Google Calendar worker。先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)，然后运行：

```bash
npm ci
npm test
npm run test:python
npm run build
npm run dev:demo
```

架构和 API 详见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) 与 [OpenAPI 3.1 契约](docs/openapi-agent.yaml)。发布历史见 [CHANGELOG.md](CHANGELOG.md)，社区准则见 [行为准则](CODE_OF_CONDUCT.md)。

## 许可证

[MIT](LICENSE)
