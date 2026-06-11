# Resume Studio — 后端设计文档（中文）

| 字段     | 内容                                                                                              |
| -------- | ------------------------------------------------------------------------------------------------- |
| 文档版本 | v2.0                                                                                              |
| 创建日期 | 2026-06-11                                                                                        |
| 状态     | Draft（待用户审阅）                                                                               |
| 设计来源 | `docs/prototype/resume-design.pen` + `open-design/apps/daemon/` 架构                              |
| 关联文档 | `2026-06-11-resume-studio-prd.zh.md`、`2026-06-11-resume-studio-frontend-design.zh.md`           |
| 取代     | `2026-06-10-resume-backend-design.zh.md`（Rust workspace + Tauri commands，已 SUPERSEDED）        |

---

## 0. 修订记录

| 版本 | 日期       | 修订人 | 说明                                                                |
| ---- | ---------- | ------ | ------------------------------------------------------------------- |
| v1.0 | 2026-06-10 | claude | 初稿 — Rust + Tauri 方向（已 SUPERSEDED）                          |
| v2.0 | 2026-06-11 | claude | 重写 — Node Daemon + Skills 协议 + CLI/BYOK 双轨，对齐 Open Design |

---

## 1. 目标与非目标

### 目标

- 给 Resume Studio 完整产品提供 Node Daemon 工程蓝图：daemon 启动 → skills/systems 协议 → agent 适配 → BYOK proxy → SSE chat 流 → Human-loop 协议 → artifact 沙盒 → SQLite → 导入导出 → 安全 → 错误模型 → 测试。
- 让后续每一次新增能力都是「加一个 skill 文件 / 加一个 design system 文件 / 加一个 adapter 文件」，**不重写既有模块**。
- 给前端一份稳定 API（HTTP + SSE）契约。

### 非目标

- 不写云端服务设计（v1.0 全本地 daemon）。
- 不重述 PRD 的产品需求。
- 不涵盖前端 React 实现（见前端 spec）。
- 不写 CI / 发布流程的细节（独立运维文档）。
- **不复用旧 Rust workspace**（`crates/resume-core` 等仅作为方向探索归档）。

---

## 2. 工程结构

### 2.1 顶层目录

参照 `open-design/`：

```
resume_design/
├── apps/
│   ├── daemon/                       本地特权 daemon + od-resume bin
│   ├── web/                          Next.js 16 web 入口
│   ├── desktop/                      （可选 v1.x）Electron 壳
│   └── packaged/                     （可选 v1.x）打包入口
├── packages/
│   ├── contracts/                    HTTP + SSE 类型契约（前后端共享）
│   ├── sidecar-proto/                Sidecar 业务协议（v1.x 桌面用）
│   ├── sidecar/                      通用 sidecar 运行时（v1.x）
│   └── platform/                     OS 进程原语（v1.x）
├── tools/
│   ├── dev/                          tools-dev 本地生命周期
│   └── pack/                         tools-pack 打包
├── skills/                           内置 skills（顶层）
├── design-systems/                   内置 design systems
├── craft/                            通用 craft 共享规则
├── templates/                        项目种子模板
├── prompt-templates/                 prompt 模板（discovery / directions）
├── e2e/                              端到端测试
├── docs/
├── package.json                      pnpm workspace 根
├── pnpm-workspace.yaml
└── flake.nix                         （可选）
```

> v1.0 优先 `apps/daemon` + `apps/web` + `packages/contracts` + 顶层 `skills/` `design-systems/` `craft/` `templates/`。其余目录是 v1.x 的扩展点。

### 2.2 单向依赖

```
packages/contracts        （叶子层，零依赖）
   ▲
   │ depended on by
   │
apps/web ─────────► apps/daemon
                       │
                       ├── 加载 skills/ design-systems/ craft/ templates/
                       └── spawn CLI adapter / 转发 BYOK proxy
```

约束：

- `packages/contracts` 不能依赖 Next.js / Express / Node fs / 浏览器 API / SQLite / 任何 app。
- `apps/web` 不能 import `apps/daemon/src/**`；只能 import `packages/contracts`。
- `apps/daemon` 不能 import `apps/web/**`。

### 2.3 关键包依赖（节选）

```jsonc
// apps/daemon/package.json
{
  "dependencies": {
    "@resume-studio/contracts": "workspace:*",
    "fastify": "^5",                  // HTTP + SSE 框架
    "better-sqlite3": "^11",          // 同步 SQLite（性能 + 简单）
    "@anthropic-ai/sdk": "^0.40",     // BYOK Anthropic
    "openai": "^4.70",                // BYOK OpenAI / Azure
    "@google/generative-ai": "^0.20", // BYOK Gemini
    "ws": "^8",
    "execa": "^9",                    // CLI spawn
    "tmp-promise": "^3",
    "puppeteer-core": "^23",          // PDF 渲染（headless Chromium）
    "marked": "^14",                  // markdown -> HTML
    "sharp": "^0.33",                 // 图片处理
    "keytar": "^7",                   // 系统 keyring
    "zod": "^3",                      // schema 校验
    "tracing-pino": "^9"              // 日志
  }
}
```

---

## 3. Daemon 启动与生命周期

### 3.1 入口

```
apps/daemon/src/
├── main.ts                  od-resume bin 入口
├── server.ts                Fastify 实例 + 路由注册
├── env.ts                   端口 / 路径 / 标志位
├── tools-dev/               与 tools/dev 协议对接
└── ...
```

### 3.2 tools-dev lifecycle

参照 `open-design/tools/dev/`：

```bash
pnpm tools-dev                          # 一键启动 daemon + web
pnpm tools-dev start daemon
pnpm tools-dev run web --daemon-port 17456 --web-port 17573
pnpm tools-dev status --json
pnpm tools-dev logs --json
pnpm tools-dev stop
pnpm tools-dev check
```

- 端口默认 daemon 17456 / web 17573，可通过 flag 改。
- `OD_RESUME_PORT` 环境变量等价 `--daemon-port`，给 web 同源代理使用。
- 进程之间通过文件标识符（`.tmp/<source>/<namespace>/daemon.json`）发现端口与 pid。

### 3.3 健康检查

`GET /api/health` 返回：

```json
{
  "status": "ok",
  "version": "1.0.0",
  "uptimeSec": 1234,
  "agents": { "cliCount": 2, "byokProviders": 1 },
  "skills": 22,
  "designSystems": 14
}
```

---

## 4. 总体 API 矩阵

### 4.1 HTTP（按资源）

| 方法   | 路径                                              | 用途                                        |
| ------ | ------------------------------------------------- | ------------------------------------------- |
| GET    | `/api/health`                                     | 健康检查                                    |
| GET    | `/api/config`                                     | 拉取 AppConfig                              |
| PATCH  | `/api/config`                                     | 更新 AppConfig                              |
| GET    | `/api/agents`                                     | 列出 CLI 检测结果 + BYOK provider 状态      |
| POST   | `/api/agents/byok/test`                           | 测试 BYOK key                               |
| GET    | `/api/projects`                                   | 项目列表                                    |
| POST   | `/api/projects`                                   | 新建项目                                    |
| GET    | `/api/projects/:id`                               | 单项目详情                                  |
| PATCH  | `/api/projects/:id`                               | 改项目名 / locale / design system           |
| DELETE | `/api/projects/:id`                               | 删项目（移到回收站）                        |
| POST   | `/api/projects/:id/duplicate`                     | 复制                                        |
| GET    | `/api/projects/:id/state`                         | ProjectView 初始 state（含消息历史 + tabs） |
| GET    | `/api/projects/:id/files`                         | 文件树                                      |
| GET    | `/api/projects/:id/files/:path*`                  | 读单文件                                    |
| PUT    | `/api/projects/:id/files/:path*`                  | 写单文件                                    |
| DELETE | `/api/projects/:id/files/:path*`                  | 删单文件                                    |
| POST   | `/api/projects/:id/upload`                        | 拖拽上传                                    |
| GET    | `/api/conversations/:id/messages`                 | 列消息（分页）                              |
| POST   | `/api/conversations/:id/messages`                 | 发送 user 消息                              |
| POST   | `/api/conversations/:id/cards/:cardId/respond`    | 响应 human-loop 卡片                        |
| POST   | `/api/conversations/:id/cancel`                   | Stop 中断                                   |
| POST   | `/api/conversations/:id/tweak`                    | Tweaks 面板调参                             |
| GET    | `/api/skills`                                     | Skills 列表                                 |
| GET    | `/api/skills/:id`                                 | Skill 详情（含 SKILL.md + example）         |
| GET    | `/api/design-systems`                             | Design Systems 列表                         |
| GET    | `/api/design-systems/:id`                         | DS 详情                                     |
| POST   | `/api/import/claude-design`                       | 导入 Claude Design ZIP                      |
| POST   | `/api/import/json-resume`                         | 导入 JSON Resume                            |
| POST   | `/api/import/flowcv`                              | 导入 FlowCV JSON                            |
| POST   | `/api/import/pdf`                                 | 导入 PDF（OCR + agent extract）             |
| POST   | `/api/projects/:id/export/:format`                | 导出（format: html / pdf / docx / md / json / zip）|
| GET    | `/api/system/data-dir`                            | appData 路径 + 操作                          |
| POST   | `/api/system/migrate-data-dir`                    | 迁移目录                                    |

### 4.2 SSE

| 路径                                       | 用途                                                          |
| ------------------------------------------ | ------------------------------------------------------------- |
| `/api/conversations/:id/stream`            | 主对话流（agent 响应、todo、卡片、artifact chunk、错误等）    |
| `/api/proxy/anthropic/stream`              | BYOK Anthropic 转发（daemon 内部用）                          |
| `/api/proxy/openai/stream`                 | BYOK OpenAI / Azure                                           |
| `/api/proxy/google/stream`                 | BYOK Gemini                                                   |

### 4.3 错误响应

所有 HTTP 错误：

```json
{
  "code": "agent_failed",
  "message": "Claude Code spawn 失败：找不到 npx",
  "retry": true,
  "details": { ... }
}
```

`code` 枚举见 §22。

---

## 5. Skill 协议

### 5.1 文件布局

```
skills/<skill-name>/
├── SKILL.md            主文档（必须）
├── example.html        在线预览样例（建议）
├── example.json        样例数据（建议）
├── preview.png         缩略图（可选）
├── prompts/            分步 prompt 模板（可选）
└── assets/             静态资源（可选）
```

### 5.2 SKILL.md frontmatter

参照 Claude Code SKILL 协议 + 自定 `rs:` 扩展：

```yaml
---
name: resume-modern-tech
description: 现代科技公司岗位的简历生成（双列 + 系统字体 + 蓝色主色）
version: 1.0.0
author: resume-studio
license: Apache-2.0

# Claude Code 通用字段（可选）
trigger:
  - "resume"
  - "简历"
  - "modern"

# rs: 简历专属扩展
rs:
  mode: resume                          # resume / cover-letter / portfolio
  industry: [tech]                      # 行业 tag
  target_role: [engineer, pm, designer] # 目标岗位
  fidelity: high                        # wireframe / high
  default_for_industry: tech            # 该行业默认 skill
  ats_target: high                      # low / medium / high
  locale_default: en-US
  bilingual_support: true
  example_prompt: 帮我做一份给 Anthropic Sonnet 工程师岗位的简历

# 视觉预览
preview:
  type: html
  thumbnail: preview.png

# 依赖（可选）
design_system:
  recommends: [linear-style, stripe-style, anthropic-style]

# Tweaks 暴露（可选）
tweaks:
  - key: accent_color
    type: color
    default: "#0066FF"
  - key: photo
    type: toggle
    default: true
---

# Resume — Modern Tech

[skill 正文：风格规则 / 段落结构 / 字体栈 / 必备 section / ATS 兜底 / 输出示例]
```

### 5.3 加载与索引

```ts
// apps/daemon/src/skills.ts
export async function loadSkills(rootDirs: string[]): Promise<SkillSummary[]> {
  // 1. 扫描每个 root 目录（builtin + user）
  // 2. 每个子文件夹尝试读 SKILL.md
  // 3. 解析 frontmatter（gray-matter）
  // 4. zod schema 校验 rs: 字段
  // 5. 合并：builtin 优先，user 覆盖同名
  // 6. 返回 SkillSummary[]（不含正文，节省内存）
}
```

- `builtin`：仓库内 `skills/`。
- `user`：`appData/Resume Studio/skills/`。
- 启动时扫一次；运行期通过 `POST /api/skills/reload` 触发重扫（v1.x）。

### 5.4 agent 内 Skill 注入

- Agent 调用前，daemon 根据 `rs:industry` / `rs:target_role` / 用户显式 `/skill:` 选出一组 skill。
- 把选中 skill 的 SKILL.md 正文 + 相关 prompt 模板，拼接到 system prompt 头部。
- Agent 输出后，daemon 在 ToolCard 中标注实际使用了哪些 skill（透明可审计）。

### 5.5 V1.0 内置 18-25 个 skill

**风格类（6-8）**：

- `resume-classic` / `resume-modern-tech` / `resume-editorial-academic` / `resume-bold-creative` / `resume-warm-personal` / `resume-brutalist-bold` / `resume-swiss-minimal` / `resume-bilingual-cn-en`

**能力类（8-10）**：

- `bullet-polish` / `summary-rewrite` / `experience-extract` / `cover-letter-draft` / `ats-optimize` / `jd-tailoring` / `critique` / `translate-cn-en` / `industry-deep-dive` / `metric-quantify`

**辅助类（4-6）**：

- `photo-suggest` / `link-curate` / `length-tighten` / `length-expand` / `bullet-merge` / `bullet-split`

---

## 6. Design System 协议

### 6.1 文件布局

```
design-systems/<system-id>/
├── DESIGN.md           主文档
├── palette.json        4 色签名 + 扩展色板
├── fonts.json          字体栈（en + zh）
├── thumbnail.png       4 色签名缩略
├── showcase.html       示例简历（用统一数据渲染）
└── tokens.css          可选 CSS 变量导出
```

### 6.2 DESIGN.md frontmatter

```yaml
---
name: anthropic-style
description: Anthropic 官方风格 — 暖灰底 + 焦糖橙 + 衬线编辑体
author: anthropic-inspired
license: Apache-2.0

palette:
  primary: "#D97757"
  ink: "#1D102C"
  surface: "#F4F0E8"
  accent: "#3B82F6"

fonts:
  display:
    en: "Tiempos Headline", "Charter", Georgia, serif
    zh: "Source Han Serif SC", "Songti SC", serif
  body:
    en: "Inter", system-ui, sans-serif
    zh: "PingFang SC", "Hiragino Sans GB", sans-serif

industries: [tech, ai, research]
default_for: false
preview:
  type: html
  thumbnail: thumbnail.png
---

# Anthropic Style

[正文：色彩使用规则 / 字体层级 / 段距 / 圆角 / 阴影 / 适用场景]
```

### 6.3 加载

类似 §5.3：扫描 builtin + user → zod schema 校验 → 返回 `DesignSystemSummary[]`。

### 6.4 V1.0 内置 12-20 套（详见 PRD §3.3）

按行业分组：科技 5、金融 2、设计 2、学术 2、创意 3、通用 3-4。

---

## 7. Craft 共享规则

参照 `open-design/craft/`：通用品牌无关的设计规则，skill 可通过 `od.craft.requires` / `rs.craft.requires` opt-in：

```
craft/
├── accessibility-baseline.md
├── animation-discipline.md
├── anti-ai-slop.md
├── color.md
├── typography.md
├── typography-hierarchy.md
├── typography-hierarchy-editorial.md
├── form-validation.md
├── rtl-and-bidi.md
└── state-coverage.md
```

`anti-ai-slop.md` 等会被 skill 加载时拼进 system prompt 头部，强约束 agent 不产出 "AI 味" 文案。

---

## 8. Agent 适配器矩阵

### 8.1 接口

```ts
// packages/contracts/src/agents.ts
export type AgentSource = "cli" | "byok";

export type AgentInfo = {
  id: string;                                  // "claude-code" | "codex" | "byok:anthropic" | ...
  source: AgentSource;
  name: string;                                // 显示名
  version?: string;
  status: "healthy" | "not_installed" | "broken" | "not_configured";
  capabilities: {
    streaming: boolean;
    tools: boolean;
    images: boolean;
  };
  provider?: "anthropic" | "openai" | "azure" | "google";  // BYOK 用
  model?: string;                              // BYOK 用
};
```

### 8.2 适配器目录

```
apps/daemon/src/agents/
├── registry.ts                  汇总 + PATH 扫描
├── adapter.ts                   Adapter 接口
├── cli/
│   ├── claude-code.ts           Claude Code CLI 适配
│   ├── codex.ts                 Codex CLI
│   ├── cursor-agent.ts          Cursor Agent
│   ├── gemini-cli.ts            Gemini CLI
│   └── common.ts                spawn / stdin / prompt-file 兜底
├── byok/
│   ├── anthropic.ts             直调 @anthropic-ai/sdk
│   ├── openai.ts                直调 openai SDK
│   ├── azure-openai.ts
│   └── google.ts
└── proxy/
    └── normalize.ts             把各家 SSE 归一化
```

### 8.3 Adapter 接口

```ts
export interface AgentAdapter {
  readonly info: AgentInfo;
  start(input: AgentInvocation): AsyncIterableIterator<SseEvent>;
  cancel(): Promise<void>;
}

export type AgentInvocation = {
  conversationId: string;
  projectId: string;
  systemPrompt: string;            // 已拼好 skill / craft / DS 上下文
  messages: ChatMessage[];         // 历史
  workspaceDir: string;            // 仅暴露此目录
  abortSignal: AbortSignal;
};
```

### 8.4 CLI 自动检测

```ts
// apps/daemon/src/agents/registry.ts
export async function detectCliAgents(): Promise<AgentInfo[]> {
  return await Promise.all([
    tryDetect("claude-code", async () => execa("claude-code", ["--version"])),
    tryDetect("codex",       async () => execa("codex",       ["--version"])),
    tryDetect("cursor-agent",async () => execa("cursor-agent",["--version"])),
    tryDetect("gemini",      async () => execa("gemini",      ["--version"])),
  ]);
}
```

- 失败的 adapter status = `not_installed`，仍出现在 AgentPicker 中。
- 检测在 daemon 启动 + 每 60s 重做一次（user 安装新 CLI 不需重启）。

### 8.5 ENAMETOOLONG 兜底（Windows）

参照 `open-design`：CLI 调用时 prompt 过长 → Windows `ENAMETOOLONG`。

兜底策略链：

1. 优先 stdin pipe（无长度限制）。
2. 若 CLI 不支持 stdin → 写 prompt 到 tempfile，传 `--prompt-file <path>`。
3. 仍失败 → 截断 prompt 上下文（保留最近 K 条）+ 警告 toast。

---

## 9. BYOK Proxy

### 9.1 路由

```
POST /api/proxy/anthropic/stream     # body: { baseUrl, apiKey, model, messages, system }
POST /api/proxy/openai/stream
POST /api/proxy/google/stream
```

> v1.0 daemon 内部使用；前端不直接调用。前端走 `/api/conversations/:id/stream` 时，daemon 根据 config 决定走 CLI adapter 还是 BYOK proxy。

### 9.2 实现要点

- 使用各 provider 官方 SDK（流式接口）。
- 接收上游 SSE chunk → 经 `normalize.ts` 转换为内部统一 `SseEvent` union → 写回 daemon 主对话流。
- API Key 仅在调用瞬间从 keyring 取出；调用后不缓存。
- 错误统一映射为 `AppError`。

### 9.3 SSRF 防护

```ts
// apps/daemon/src/security/ssrf.ts
const ALLOWED_PROXY_HOSTS = new Set([
  "api.anthropic.com",
  "api.openai.com",
  ".openai.azure.com",
  "generativelanguage.googleapis.com",
]);

export function assertAllowedUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  // 拒绝：内网 IP（10/8、172.16/12、192.168/16、127/8、169.254/16、::1、fc00::/7、fe80::/10）
  // 拒绝：私有 DNS rebinding
  // 检查 host 在白名单或自定义 baseUrl 在用户授权列表
}
```

- 默认白名单 = 4 个 provider 官方域名。
- 用户在 Settings 自定义 `baseUrl`（如自托管 Azure / OpenAI 兼容 proxy）→ 显式弹窗确认 → 写入授权列表。

---

## 10. Chat 流（SSE 事件协议）

### 10.1 SSE event 定义

```ts
// packages/contracts/src/sse.ts
export type SseEvent =
  | { type: "message_started";   id: string; role: "assistant" }
  | { type: "message_delta";     id: string; delta: string }
  | { type: "message_completed"; id: string }
  | { type: "tool_call";         id: string; tool: string; args: unknown }
  | { type: "tool_done";         id: string; output: unknown }
  | { type: "todo_update";       todos: Todo[] }
  | { type: "card";              card: HumanLoopCard }                          // 见 §11
  | { type: "artifact_chunk";    tabId: string; delta: string; meta?: ArtifactMeta }
  | { type: "artifact_done";     tabId: string; final: Artifact }
  | { type: "error";             code: ErrorCode; message: string; retry?: boolean }
  | { type: "done";              durationMs: number; tokensIn?: number; tokensOut?: number };
```

### 10.2 编码

```
event: message_delta
data: {"id":"msg_1","delta":"我"}

event: message_delta
data: {"id":"msg_1","delta":"先"}

event: todo_update
data: {"todos":[...]}

...
```

- 标准 SSE：`event:` + `data:`（单行 JSON）。
- 心跳：每 15s `event: ping` 防 idle 断开。

### 10.3 上下游

```
前端发 user 消息 (POST /messages)
      │
      ▼
daemon ChatOrchestrator
      ├── 拼 system prompt（skill + DS + craft）
      ├── 选 adapter（CLI 或 BYOK）
      ├── 调 adapter.start() 返回 AsyncIterator<SseEvent>
      ├── 逐 event 写回前端 SSE
      ├── tool_call 中 dispatch 到 Tool Handler（Write / Read / Bash / Card / ...）
      └── 完成或被 cancel
```

### 10.4 取消语义

`POST /api/conversations/:id/cancel`：

- daemon 触发 `AbortSignal`。
- adapter 终止子进程 / 关闭 SSE 上游。
- 写一条 `event: error` `code: "cancelled"` 通知前端。

---

## 11. Human-loop 卡片协议

### 11.1 Tool 触发

Agent 通过特殊 tool name 触发卡片发送：

| Tool name             | 产出卡片类型      |
| --------------------- | ----------------- |
| `AskQuestionForm`     | `question_form`   |
| `AskDirection`        | `direction_pick`  |
| `AskOption`           | `option_card`     |
| `AskConfirm`          | `confirm_card`    |
| `AskDiff`             | `diff_card`       |

工具调用参数即卡片 payload。

### 11.2 Card 持久化

```sql
CREATE TABLE cards (
  id            TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  kind          TEXT NOT NULL,         -- question_form / direction_pick / ...
  payload       TEXT NOT NULL,         -- JSON
  status        TEXT NOT NULL,         -- pending / responded / cancelled / expired
  response      TEXT,                  -- JSON
  created_at    INTEGER NOT NULL,
  responded_at  INTEGER
);
```

### 11.3 响应回路

```
前端 POST /api/conversations/:id/cards/:cardId/respond
      body: { payload: { ...用户填的 } }
      ↓
daemon
  ├── 标记 card status = responded，写 response
  ├── 把 response 翻译为一条 user 消息（带 marker：[card response cardId]）
  ├── 触发 agent 继续工作
  └── SSE 推 message_started → ... → done
```

### 11.4 不阻塞

- 用户在 pending card 时直接打字发新消息 → daemon 将所有 pending card 标 `expired` → 把用户消息正常喂给 agent。
- Agent 在 system prompt 中被告知「expired card 不必处理」。

### 11.5 V1.0 五类卡片 schema

详见前端 spec §10.1。Daemon 侧每个 Card 工具有 zod 校验：

```ts
export const QuestionFormSchema = z.object({
  prompt: z.string(),
  fields: z.array(FieldSchema).min(1).max(10),
});
```

---

## 12. Artifact 解析 + 沙盒

### 12.1 Artifact 输出格式

Agent 通过 `Write` tool 把文件落到项目 workspace；其中 `<artifact>` 标签的内容会被识别为可预览的 artifact。

参照 Claude Design / Open Design：

```html
<artifact identifier="resume-v1" type="text/html" title="Resume — Modern Tech">
<!DOCTYPE html>
<html>
  <head>...inline styles...</head>
  <body>...resume content...</body>
</html>
</artifact>
```

或者用项目文件夹形式：

```
projects/<id>/artifacts/v1/
├── resume.html
├── styles.css        （可选独立）
├── data.json         （resume 结构化数据）
└── preview.png       （服务端渲染缩略图）
```

> **实施修订（2026-06-12，slice 3）**：artifact 解析采用 **message_completed 后一次性提取**，而非流式 chunk 级解析 —— 跨 chunk 的标签边界检测复杂度高、收益低。`artifact_chunk` SSE 事件保留在 contracts 中但暂不发射；流式 artifact 渲染推迟到 slice 11（性能优化）。聊天历史只保留 artifact 外的正文，artifact 本体进 ArtifactStore（`projects/<id>/artifacts.json` + `resume.html`）。

### 12.2 解析

```ts
// apps/daemon/src/artifacts/parser.ts
export function parseArtifact(html: string): ParsedArtifact {
  // 用 cheerio / parse5 解析
  // 提取 <artifact> 标签内容
  // 验证 identifier / type / title
  // 提取 inline CSS / JS（v1.0 拒绝 JS）
  // 抽出 <img src="..."> 资源引用（仅允许 data: 或项目内相对路径）
  // 返回 ParsedArtifact
}
```

### 12.3 沙盒处理

服务端预处理（写入 workspace 前）：

- 剥除 `<script>` 标签与所有 `on*` 事件属性。
- 剥除 `<iframe>`、`<object>`、`<embed>`。
- 把远程 `<img src="https://...">` 替换为占位或 base64 内嵌（v1.0 仅警告，不自动下载）。
- CSS 中 `@import` 与 `url(http...)` 被剥除。
- 保留：标准语义 HTML、内联 style 属性、`<link rel="stylesheet">` 仅允许同源相对路径。

### 12.4 Artifact 版本

```sql
CREATE TABLE artifacts (
  id              TEXT PRIMARY KEY,
  project_id      TEXT NOT NULL,
  version         INTEGER NOT NULL,
  tab_id          TEXT NOT NULL,           -- 同 tab_id 的多个版本可回退
  identifier      TEXT NOT NULL,
  type            TEXT NOT NULL,           -- text/html / application/json / ...
  title           TEXT,
  file_path       TEXT NOT NULL,           -- 相对 project workspace
  is_final        INTEGER NOT NULL DEFAULT 0,
  created_at      INTEGER NOT NULL
);
```

每次 agent 写新 artifact = 新 version 行；最多保留 20 版，超出 GC 老版本。

---

## 13. 项目工作区

### 13.1 目录布局

```
<appData>/Resume Studio/
├── app.sqlite                        SQLite 主库
├── settings.json                     非敏感全局配置（语言 / 主题 / 上次端口）
├── projects/
│   └── <projectId>/
│       ├── resume.html               最新 artifact 入口
│       ├── resume.json               最新 resume 数据
│       ├── styles.css
│       ├── references/               用户上传的参考素材
│       ├── artifacts/
│       │   ├── v1/
│       │   ├── v2/
│       │   └── ...
│       └── backups/
│           └── 2026-06-11T08-30-00Z.zip
├── skills/                           用户加载的 skill
├── design-systems/                   用户加载的 DS
├── trash/                            被删项目（系统回收站封装）
└── logs/
    └── daemon-2026-06-11.log
```

### 13.2 路径解析

```ts
// apps/daemon/src/paths.ts
export function appDataDir(): string;
export function projectDir(projectId: string): string;
export function artifactDir(projectId: string, version: number): string;
export function backupsDir(projectId: string): string;
export function skillsDirs(): string[];          // [builtin, user]
export function designSystemsDirs(): string[];
```

### 13.3 R/W 边界

- 所有 `:path*` 路由的参数走 `path.normalize` + `path.resolve`，校验 resolved path **必须以 `projectDir(projectId)` 开头**。
- 拒绝符号链接出框。
- 拒绝 `..` 跨界。
- 拒绝绝对路径。

```ts
function assertInsideProject(projectId: string, rel: string) {
  const root = projectDir(projectId);
  const target = path.resolve(root, rel);
  if (!target.startsWith(root + path.sep)) {
    throw new AppError("path_outside_project", `path escapes workspace: ${rel}`);
  }
}
```

---

## 14. SQLite 持久化

### 14.1 库文件

`<appData>/Resume Studio/app.sqlite`，WAL 模式，`better-sqlite3` 同步驱动。

### 14.2 表结构

```sql
CREATE TABLE projects (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  locale            TEXT NOT NULL,
  design_system_id  TEXT,                   -- 可为空 = AI 选
  fidelity          TEXT NOT NULL,          -- wireframe / high
  thumbnail_path    TEXT,
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL,
  trashed_at        INTEGER                 -- NULL = 活跃
);

CREATE TABLE conversations (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id),
  agent_id    TEXT,                        -- 上次使用的 agent
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id),
  kind            TEXT NOT NULL,           -- user / assistant / tool_call / todo_update / card / error / done
  payload         TEXT NOT NULL,           -- JSON
  created_at      INTEGER NOT NULL
);

CREATE TABLE cards (...);                  -- 见 §11.2

CREATE TABLE artifacts (...);              -- 见 §12.4

CREATE TABLE tabs (
  id              TEXT PRIMARY KEY,
  project_id      TEXT NOT NULL REFERENCES projects(id),
  kind            TEXT NOT NULL,           -- file / artifact / design-files
  ref             TEXT NOT NULL,           -- 文件路径 / artifact id
  display_name    TEXT NOT NULL,
  position        INTEGER NOT NULL,
  is_active       INTEGER NOT NULL,
  opened_at       INTEGER NOT NULL
);

CREATE TABLE saved_templates (...);        -- 项目种子模板

CREATE INDEX idx_msgs_conv     ON messages(conversation_id, created_at);
CREATE INDEX idx_artifacts_proj ON artifacts(project_id, version DESC);
CREATE INDEX idx_tabs_proj      ON tabs(project_id, position);
```

### 14.3 迁移

```ts
// apps/daemon/src/db/migrations/
// 001_init.sql
// 002_add_tabs.sql
// ...
```

启动时按序 apply，pragma `user_version` 记进度。

### 14.4 备份

- 每次 emit artifact 触发增量备份：把当前 project 整目录 ZIP 到 `backups/<rfc3339>.zip`。
- 每个项目最多保留 10 份；超出删最旧。

---

## 15. 导入流程

### 15.1 Claude Design ZIP

参照 Open Design：`POST /api/import/claude-design`

- 解析 ZIP → 拿到 messages / artifacts / metadata。
- 新建项目（命名 = ZIP 内 metadata 名 + 「(imported)」）。
- 把 messages 注入新 conversation。
- 把 artifacts 写到项目 workspace + artifacts/ 目录。
- 返回新 projectId，前端跳转。

### 15.2 JSON Resume / FlowCV JSON

- 直接解析为 `resume.json`（结构化数据）。
- Daemon 触发一次 agent 调用：「请按 design system X 渲染这份 JSON 为 artifact」。
- 用户进入 ProjectView 看到第一条 user 消息（系统注入）+ agent 生成的 artifact。

### 15.3 PDF OCR

- Daemon 用 `pdf-parse` / `pdfjs-dist` 提取文本。
- 文本喂给 agent，强制调用 `experience-extract` skill 结构化。
- 输出 `resume.json` + artifact。
- 不强求 OCR 完美 → 触发一个 `question_form` 卡让用户校对关键字段。

### 15.4 粘贴文本

- ChatComposer 中粘贴 → 检测长度 → 超 1000 字符 → 提示「这看起来像是简历草稿？是否走 extract 流程？」（OptionCard）。

---

## 16. 导出

### 16.1 路由

`POST /api/projects/:id/export/:format`

参数：

```ts
{
  artifactId?: string;     // 不指定 = 当前 final，再不指定 = 最新版
  outPath?: string;        // 可选；不指定则返回二进制流让前端走系统对话框
}
```

### 16.2 各格式实现

| 格式      | 实现                                                                                              |
| --------- | ------------------------------------------------------------------------------------------------- |
| HTML      | 直接读 artifact 的 resume.html（已 inline CSS）                                                  |
| PDF       | `puppeteer-core` + 用户 OS 自带 Chromium / Edge → loadURL(file://) → `page.pdf()`                |
| DOCX      | `html-to-docx` 包 → 转换；字体回退到系统                                                          |
| Markdown  | 从 `resume.json` 渲染（agent 行为或纯模板）                                                       |
| JSON      | 直接 dump `resume.json`                                                                           |
| ZIP       | `archiver` 包 → 打包整个项目目录（artifacts + 数据 + metadata），适合 Claude Design 风格的交换    |

### 16.3 PDF 字体

- 内置 `NotoSansCJK-subset.ttf` + `Inter.ttf`，inline 到 HTML（`@font-face` data: URI）。
- 用户系统装了的字体优先使用。

---

## 17. 安全

### 17.1 网络

- 只允许 4 个 BYOK provider 官方域名 + 用户授权 baseUrl。
- 拒绝内网 / localhost / link-local。
- 见 §9.3。

### 17.2 文件系统

- 项目 R/W 边界严格（§13.3）。
- 文件名校验：禁止 `..`、控制字符、平台保留名（CON / PRN / AUX 等 Windows）。
- 上传大小上限 10 MB。

### 17.3 进程

- CLI spawn 不传 shell（避免命令注入）。
- 仅暴露项目 workspace 目录给 CLI；通过 `cwd` 设定 + 环境变量收紧。
- 子进程超时 5 分钟硬上限。

### 17.4 keyring

- 用 `keytar`：service = `Resume Studio`，account = `byok-<provider>`。
- key 永不写文件 / 日志。
- 日志最后 4 位用于排错。

### 17.5 模板沙盒

- 见 §12.3。
- skill / design system 加载时校验：禁止 SKILL.md 包含可执行内容（仅 markdown + JSON / YAML 配置）。

### 17.6 依赖审计

- `pnpm audit` + Renovate / Dependabot 定期更新。
- 关键依赖（@anthropic-ai/sdk、openai、puppeteer-core、better-sqlite3）锁版本。

---

## 18. 错误模型

### 18.1 AppError 形态

```ts
// packages/contracts/src/errors.ts
export type ErrorCode =
  | "io"
  | "json"
  | "schema"
  | "path_outside_project"
  | "agent_failed"
  | "agent_cancelled"
  | "byok_not_configured"
  | "byok_unauthorized"
  | "byok_rate_limited"
  | "ssrf_blocked"
  | "card_invalid"
  | "card_expired"
  | "artifact_parse"
  | "artifact_sandbox_rejected"
  | "import_format"
  | "export_failed"
  | "render_failed"
  | "skill_missing"
  | "design_system_missing"
  | "internal";

export type AppError = {
  code: ErrorCode;
  message: string;
  retry?: boolean;
  details?: unknown;
};
```

### 18.2 错误传播

```ts
// 内部抛
throw new AppError("agent_failed", "Claude Code spawn 失败：找不到 npx", true);

// HTTP 层捕获
app.setErrorHandler((err, req, reply) => {
  if (err instanceof AppError) {
    reply.code(httpStatusFor(err.code)).send(err.toJSON());
  } else {
    log.error({ err }, "internal");
    reply.code(500).send({ code: "internal", message: "Unexpected error" });
  }
});
```

### 18.3 日志

- `tracing-pino` 输出 JSON。
- 默认级 `info`；Settings 中可切 `debug`。
- 日志文件 `logs/daemon-YYYY-MM-DD.log`，保留 7 天。
- **严禁日志中出现**：BYOK key、完整简历 PII、PDF OCR 全文（仅记录长度或哈希）。

---

## 19. 性能与并发

### 19.1 关键目标

| 操作                          | 目标         | 实现要点                                          |
| ----------------------------- | ------------ | ------------------------------------------------- |
| 启动 daemon                   | ≤ 1.5 s      | better-sqlite3 同步连接；skills lazy 解析正文      |
| 拉项目列表                    | ≤ 50 ms      | 直接 SQL                                          |
| 拉项目完整 state              | ≤ 200 ms     | 单事务 join 多表                                  |
| SSE 首字延迟                  | ≤ 800 ms     | adapter 启动 + 上游响应                           |
| Artifact 写入                 | ≤ 100 ms     | 流式写 + 完成后落库                               |
| PDF 渲染（1 页）               | ≤ 3 s        | puppeteer 单例 + 复用                             |
| 文件树扫                      | ≤ 50 ms      | 目录小                                            |

### 19.2 并发约束

| 资源              | 上限                                              |
| ----------------- | ------------------------------------------------- |
| 同 conversation   | 同时 1 个 agent 调用；新 user 消息自动 cancel 旧的 |
| 跨 conversation   | 全局并发 5 个 agent；超出排队                     |
| PDF 渲染          | puppeteer 单例，全局 mutex                        |
| BYOK 调用         | 每 provider 同时 3 个；超出排队                   |

---

## 20. 测试策略

### 20.1 单元（Vitest）

- Skill / DS frontmatter 解析 + zod 校验。
- Path 安全 helper：人工构造越界路径，确保 reject。
- SSE 编码 / 解码 round-trip。
- AppError 序列化。
- Artifact parser：剥脚本、识别 inline css。

### 20.2 集成

- 模拟 agent adapter：返回固定 SSE 流；走 daemon 全链路验证消息持久化。
- 模拟 BYOK proxy：mock HTTP server，验证 SSE 归一化。
- 模拟 CLI spawn：用本机 `node -e` 模拟。

### 20.3 端到端（参照 `open-design/e2e/`）

- 启动真 daemon + web → 新建项目 → 发消息 → mock 一个 agent → 校验 artifact 写盘 + UI 渲染。
- 隐私确认弹窗流程。
- 切换 agent 不丢消息。
- ZIP 导入 → 项目存在 + artifact 可预览。

### 20.4 CI

```bash
pnpm install
pnpm guard
pnpm typecheck
pnpm --filter @resume-studio/daemon test
pnpm --filter @resume-studio/web test
pnpm --filter e2e test
pnpm audit --prod
```

---

## 21. Roadmap（slice 切分，与 PRD §13 对齐）

| Slice | 后端范围                                                                                                                                  |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | apps/daemon bootstrap（Fastify + tools-dev lifecycle + 健康检查）+ packages/contracts 骨架                                                  |
| 1     | SQLite 初始化 + projects 表 + project CRUD HTTP                                                                                            |
| 2     | conversations / messages 表 + BYOK Anthropic adapter + 主 SSE 流（最简：user → assistant）                                                |
| 3     | Tool 调度：Write / Read / Bash + TodoWrite + Artifact 解析与写入 + project workspace 边界                                                  |
| 4     | Human-loop 5 类卡片 tool + Card 表 + 响应回路                                                                                              |
| 5     | Skills 协议（v1.0 18-25 个内置 skill 落盘 + 加载器 + System prompt 注入）                                                                  |
| 6     | Design Systems 协议（v1.0 12-20 套）+ Craft 共享规则                                                                                       |
| 7     | CLI adapter：Claude Code + Codex（v1.0 必备 2 个）+ AgentInfo registry + 自动检测                                                          |
| 8     | 导出全 6 格式：HTML / PDF（puppeteer-core）/ DOCX（html-to-docx）/ Markdown / JSON / ZIP（archiver）                                       |
| 9     | 导入全 4 来源：Claude Design ZIP / JSON Resume / FlowCV JSON / PDF OCR（pdfjs-dist + experience-extract skill）                            |
| 10    | i18n locale 支持（prompt 拼接 `{lang}` 占位）+ keyring 集成 + 数据目录迁移 + 增量备份                                                       |
| 11    | Tweaks API 端点 + 多 artifact 版本 GC + CLI adapter 扩展（Cursor Agent / Gemini CLI）+ BYOK 扩展（OpenAI / Azure / Gemini）                |
| 12    | 安全打磨（SSRF / 模板沙盒 / 文件系统边界回归）+ 性能优化 + pnpm audit + tracing-pino + GA 打包发布                                          |

---

## 22. 不做的事（明确边界）

- 不引入 Express（统一 Fastify）。
- 不引入 ORM（直接用 better-sqlite3 + 手写 SQL）。
- 不内置 LLM 推理（始终依赖 CLI 或 BYOK）。
- 不写 OCR 引擎（直接复用 pdfjs-dist + 用 agent 修正）。
- 不写云同步（v1.0 全本地）。
- 不发送遥测（除非用户显式开启）。
- 不在 daemon 暴露未鉴权的 0.0.0.0 端口（仅 127.0.0.1）。

---

## 23. 与现有代码的关系

- 旧 `crates/resume-core` / `crates/resume-render-markdown` / `apps/resume-app/` 作为方向探索归档，不再投入开发。
- 旧 `2026-06-10-*` 三份 spec 标记 SUPERSEDED。
- 新工程目录从 `apps/daemon/` + `apps/web/` + `packages/contracts/` + 顶层 `skills/` / `design-systems/` / `craft/` / `templates/` 开始搭建。

**真理来源声明**：本 spec 的视觉与交互对照以 `docs/prototype/resume-design.pen` 为准，工程架构以 `open-design/` 实际形态为参照；本 spec 与两者不一致时，以 PRD 业务定义 + prototype 视觉 + open-design 工程形态优先，并触发本 spec 修订。
