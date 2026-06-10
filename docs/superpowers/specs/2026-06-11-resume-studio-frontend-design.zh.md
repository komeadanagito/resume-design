# Resume Studio — 前端设计文档（中文）

| 字段     | 内容                                                                                              |
| -------- | ------------------------------------------------------------------------------------------------- |
| 文档版本 | v2.0                                                                                              |
| 创建日期 | 2026-06-11                                                                                        |
| 状态     | Draft（待用户审阅）                                                                               |
| 设计来源 | `docs/prototype/resume-design.pen` + `open-design/apps/web/` 实际形态                            |
| 关联文档 | `2026-06-11-resume-studio-prd.zh.md`、`2026-06-11-resume-studio-backend-design.zh.md`            |
| 取代     | `2026-06-10-resume-frontend-design.zh.md`（Tauri+React 编辑器方向，已 SUPERSEDED）              |

---

## 0. 修订记录

| 版本 | 日期       | 修订人 | 说明                                                                |
| ---- | ---------- | ------ | ------------------------------------------------------------------- |
| v1.0 | 2026-06-10 | claude | 初稿 — Tauri+React 编辑器方向（已 SUPERSEDED）                     |
| v2.0 | 2026-06-11 | claude | 重写 — Next.js + Chat + Sandboxed Artifact，对齐 Open Design 形态 |

---

## 1. 目标与非目标

### 目标

- 把 Resume Studio 完整前端蓝图说清楚：应用结构 → 状态 → Daemon 调用 → 屏幕 → Chat 消息分发 → Human-loop 卡片 → Artifact 沙盒 → 主题 → i18n → 测试。
- 任何熟悉 React + Next.js 的工程师能照本文实现新组件，**不重新发明架构**。
- 任何新增 Skill / Design System / Human-loop 卡片类型，落地路径都是「加文件 + 注册一处」。

### 非目标

- 不重述 PRD 的产品需求。
- 不涵盖 Daemon 实现细节（见后端 spec）。
- 不写视觉规范完整稿；token 与组件具体像素以 `.pen` 为准、UI 形态以 `open-design/apps/web/` 为参照。

---

## 2. 设计基线

### 2.1 视觉 token（与 `.pen` 同源）

| Token           | 值          | 用途                       |
| --------------- | ----------- | -------------------------- |
| `brand-500`     | `#0066FF`   | 主色：按钮、链接、激活态   |
| `brand-600`     | `#0052D6`   | 主色 hover                 |
| `brand-50`      | `#EBF3FF`   | 主色浅底                   |
| `ink-900`       | `#1D102C`   | 主文本                     |
| `ink-700`       | `#5C5564`   | 次要文本                   |
| `ink-500`       | `#8B8297`   | 占位 / 元信息              |
| `ink-300`       | `#A29BAB`   | 极弱文本                   |
| `surface`       | `#F5F7FA`   | 页面底色                   |
| `surface-card`  | `#FFFFFF`   | 卡片底                     |
| `surface-muted` | `#F8F6F3`   | 输入框 / 二级容器          |
| `surface-tag`   | `#F0ECE7`   | tag / chip 底              |
| `card` 半径     | `24px`      | 主卡片圆角                 |
| `button` 半径   | `16px`      | 按钮圆角                   |
| `pill` 半径     | `999px`     | 标签 / 短按钮              |

### 2.2 核心交互模式

1. **Chat-only 主屏**：所有交互入口收敛到 ProjectView 左栏的 ChatPane；右栏 FileWorkspace 同步呈现 agent 产出的文件。
2. **Human-loop 卡片**：QuestionForm / DirectionPicker / OptionCard / ConfirmCard / DiffCard 是 chat 流里的特殊消息；不切到独立屏。
3. **Sandboxed artifact iframe**：所见即所得，与导出 1:1。
4. **Agent picker**：EntryView 底部 + ChatComposer 左下显式可见，一键切换。
5. **可逆**：所有破坏性动作进入「定稿 / 备份 / 回退」三层保护。

---

## 3. 应用结构

### 3.1 选型：Next.js 16 App Router

参照 `open-design/apps/web/`（Next.js 16 + React 18）。原因：

- 与 Open Design 工程实践对齐，组件可参考。
- App Router 支持流式 SSR，配合 daemon SSE 自然。
- 未来云端部署（Vercel）零成本。
- 客户端导航 + 嵌入式 iframe 协作自然。

### 3.2 顶层路由

```
/                                # EntryView（项目列表 + 新建面板）
/p/[projectId]                   # ProjectView（chat + workspace）
/p/[projectId]/artifact/[tabId]  # 直链到某 artifact tab
/library/skills                  # Skills 库
/library/skills/[skillId]        # Skill 详情
/library/design-systems          # Design Systems 库
/library/design-systems/[dsId]   # Design System 详情
/library/examples                # 示例项目
/settings                        # Settings dialog（路由可选，也可弹层）
```

> Settings 实际以 Dialog 形态呈现（参照 `open-design` 的 `SettingsDialog.tsx`），但同时支持 `/settings` 深链便于分享。

### 3.3 工程目录

```
apps/web/
├── src/
│   ├── App.tsx                      根路由切换
│   ├── router.ts                    手写小型 router（参照 open-design）
│   ├── components/
│   │   ├── EntryView.tsx
│   │   ├── ProjectView.tsx
│   │   ├── ChatPane.tsx
│   │   ├── ChatComposer.tsx
│   │   ├── AssistantMessage.tsx
│   │   ├── ToolCard.tsx
│   │   ├── TodoCard.tsx
│   │   ├── QuestionForm.tsx
│   │   ├── DirectionPicker.tsx
│   │   ├── OptionCard.tsx
│   │   ├── ConfirmCard.tsx
│   │   ├── DiffCard.tsx
│   │   ├── FileWorkspace.tsx
│   │   ├── FileViewer.tsx
│   │   ├── ArtifactPreview.tsx
│   │   ├── AgentPicker.tsx
│   │   ├── ConnectorsBrowser.tsx
│   │   ├── DesignSystemsTab.tsx
│   │   ├── SkillsTab.tsx
│   │   ├── SettingsDialog.tsx
│   │   ├── PrivacyConsentModal.tsx
│   │   ├── NewProjectPanel.tsx
│   │   ├── LanguageMenu.tsx
│   │   ├── AvatarMenu.tsx
│   │   ├── Toast.tsx
│   │   └── form/                    通用表单原子
│   ├── state/
│   │   ├── projects.ts              project CRUD API wrapper
│   │   ├── chat.ts                  chat stream reducer + actions
│   │   ├── config.ts                AppConfig get/save + daemon 同步
│   │   ├── appearance.ts            theme apply
│   │   └── workspace.ts             file workspace state
│   ├── providers/
│   │   ├── registry.ts              fetchSkills / fetchDesignSystems / fetchAgents
│   │   └── daemon.ts                Daemon health / sidecar IPC
│   ├── runtime/
│   │   ├── sse.ts                   SSE 解析 + 重连
│   │   └── stream-dispatcher.ts     按消息类型 dispatch UI 更新
│   ├── artifacts/
│   │   ├── sandbox.ts               iframe srcdoc + 安全策略
│   │   └── parser.ts                <artifact> 标签解析
│   ├── edit-mode/
│   │   ├── ManualEditPanel.tsx
│   │   └── tweaks.ts
│   ├── lib/                         通用工具
│   ├── hooks/
│   ├── i18n/
│   ├── types/                       与 packages/contracts 同源
│   └── utils/
└── tests/                           Vitest
```

### 3.4 与 Daemon 的关系

- 前端**只通过 `packages/contracts` 中定义的 HTTP + SSE 接口**与 daemon 通信。
- 前端**不直接读文件 / 不直接 spawn 进程**；所有底层能力通过 daemon 转发。
- 开发期通过 Vite 代理转发到 `http://127.0.0.1:<daemonPort>`；生产期同源。

---

## 4. 状态管理

### 4.1 总体策略

- **不引入 Redux / Zustand**。使用 React 18 的 `useReducer` + `createContext` 组合。
- **三个根级 Provider**（在 `App.tsx` 顶层）：
  - `ConfigProvider`：AppConfig（语言 / 主题 / agent 选择 / BYOK key 引用）
  - `ProjectsProvider`：项目列表 + 当前打开项目
  - `ChatProvider`（仅在 ProjectView 内挂载）：当前 conversation 的消息流 + agent 状态

### 4.2 Chat State 形态

```ts
type ChatState = {
  conversationId: string;
  messages: ChatMessage[];            // 完整有序消息
  workingState: {
    status: "idle" | "thinking" | "tooling" | "writing" | "error";
    activeTool?: string;
    activeTodoIndex?: number;
  };
  pendingCards: Record<string, CardState>;  // 用户尚未响应的 human-loop 卡片
  cursor?: string;                          // 流式 cursor
};
```

### 4.3 Chat Action（reducer 关键 action）

```ts
type ChatAction =
  | { kind: "sse/connected" }
  | { kind: "sse/message_started"; id: string; role: "assistant"; }
  | { kind: "sse/message_delta"; id: string; delta: string }
  | { kind: "sse/message_completed"; id: string }
  | { kind: "sse/tool_call"; id: string; tool: string; args: unknown }
  | { kind: "sse/tool_done"; id: string; output: unknown }
  | { kind: "sse/todo_update"; todos: Todo[] }
  | { kind: "sse/card"; card: HumanLoopCard }      // QuestionForm / DirectionPicker / ...
  | { kind: "sse/artifact_chunk"; tabId: string; delta: string }
  | { kind: "sse/artifact_done"; tabId: string }
  | { kind: "sse/error"; code: string; message: string }
  | { kind: "sse/done" }
  | { kind: "user/send_text"; text: string }
  | { kind: "user/card_response"; cardId: string; payload: unknown }
  | { kind: "user/cancel" }                         // Stop 按钮
  | { kind: "user/retry"; messageId: string };
```

### 4.4 持久化

- Chat / Project / Tabs 全部在 daemon 侧的 SQLite。
- 前端进入 ProjectView 时通过 `GET /api/projects/<id>/state` 拉取完整初始状态。
- 之后通过 SSE 增量同步。
- 关闭窗口时不需要 flush（SSE 已经实时同步到 daemon）。

---

## 5. 类型与契约

### 5.1 `packages/contracts`

参照 `open-design/packages/contracts/`。**这是前后端的唯一接口 SoT**：

```
packages/contracts/
├── src/
│   ├── api.ts              HTTP 请求 / 响应类型
│   ├── sse.ts              SSE 事件 union
│   ├── chat.ts             ChatMessage / Todo / ToolCall / HumanLoopCard 类型
│   ├── projects.ts         Project / Conversation / Tab
│   ├── skills.ts           SkillSummary / Skill metadata
│   ├── systems.ts          DesignSystemSummary
│   ├── agents.ts           AgentInfo / AgentSource ("cli" | "byok")
│   ├── artifacts.ts        Artifact / ArtifactKind
│   ├── errors.ts           AppError union（code + message + retry?）
│   └── index.ts            统一 re-export
└── package.json
```

**约束**：

- 纯 TypeScript，零运行时依赖。
- 不导入 Next.js / Express / Node fs / SQLite / 浏览器 API。
- 改 contract = 改 PR；前后端同步审查。

### 5.2 类型同步流程

1. 改 `packages/contracts/src/<file>.ts`。
2. `pnpm --filter @resume-studio/contracts build`。
3. apps/web 与 apps/daemon 都通过 workspace 引用，重启即可。

---

## 6. Daemon API 调用层

### 6.1 文件组织

```
apps/web/src/providers/
├── registry.ts          fetchSkills / fetchDesignSystems / fetchAgents / fetchPromptTemplates
└── daemon.ts            daemonIsLive / fetchDaemonConfig / 健康检测

apps/web/src/state/
├── projects.ts          listProjects / createProject / patchProject / deleteProject / importClaudeDesignZip
├── conversations.ts     listConversations / streamConversation (SSE)
├── chat.ts              sendMessage / cancelMessage / respondToCard
└── config.ts            loadConfig / saveConfig / mergeDaemonConfig
```

### 6.2 HTTP 调用规范

```ts
// 每个 API 一个 thin wrapper
export async function listProjects(): Promise<Project[]> {
  const res = await fetch("/api/projects");
  if (!res.ok) throw await parseAppError(res);
  return res.json();
}
```

- 错误统一抛 `AppError`（来自 contracts），UI 层根据 `code` 决定 toast / 重试 / 跳转。
- 不在 wrapper 里做缓存；缓存交给 Provider state。

### 6.3 SSE 流式接口

参照 `open-design/apps/web/src/runtime/sse.ts`。规范：

```ts
type SseConnection = {
  cancel(): void;
  retry(): void;
};

export function streamConversation(
  conversationId: string,
  onEvent: (e: SseEvent) => void,
  onError: (e: AppError) => void,
): SseConnection {
  const source = new EventSource(`/api/conversations/${conversationId}/stream`);
  // 解析每条 event，dispatch 到 onEvent
  // ...
}
```

- 事件按 `event:` 字段区分（与 contracts SSE union 一致）。
- 自动重连：指数退避，最大 5 次。
- 中断：`cancel()` close EventSource + POST cancel API。

---

## 7. 屏幕清单

### 7.1 EntryView

参照 `open-design/docs/screenshots/01-entry-view.png`：

```
┌──────────────────────────────────────────────────────────────┐
│ [Logo] Resume Studio  [Research Preview]            [Avatar] │
├──────────────┬──────┬──────┬──────────────────────────────────┤
│ [Designs][Examples][Design Systems][Skills]                  │
├──────────────┴──────┴──────┴──────────────────────────────────┤
│ ┌─────────────────────┐  ┌─────────────────────────────────┐ │
│ │ Prototype Slide deck│  │ Recent  Your designs            │ │
│ │ From template Other │  │ ┌────┐ ┌────┐ ┌────┐            │ │
│ │                     │  │ │ R1 │ │ R2 │ │ R3 │            │ │
│ │ New project         │  │ │... │ │... │ │... │            │ │
│ │  ┌──────────────┐   │  │ └────┘ └────┘ └────┘            │ │
│ │  │ Project name │   │  │                                 │ │
│ │  └──────────────┘   │  │                                 │ │
│ │  Design system      │  │                                 │ │
│ │  [(let AI pick) ▾]  │  │                                 │ │
│ │  Fidelity           │  │                                 │ │
│ │  [Wireframe][High*] │  │                                 │ │
│ │  [+ Create]         │  │                                 │ │
│ └─────────────────────┘  └─────────────────────────────────┘ │
│ [Local CLI · Claude Code · 2.1.121]            [English ▾] │
└──────────────────────────────────────────────────────────────┘
```

**组件**：
- `EntryView`：根
- `NewProjectPanel`：左侧固定面板（项目名 + DS + Fidelity + Create）
- `DesignsTab`：项目卡片网格
- `ExamplesTab` / `DesignSystemsTab` / `SkillsTab` / `PromptTemplatesTab`：tab 内容
- `AgentPicker`（底部）+ `LanguageMenu`（底部）
- `AvatarMenu`（右上）

### 7.2 ProjectView

参照 `open-design/docs/screenshots/04-todo-progress.png` 与 `05-preview-iframe.png`：

```
┌──────────────────────────────────────────────────────────────────┐
│ [←] [Logo] Project Name                          [Avatar]        │
├──────────────────────────────┬───────────────────────────────────┤
│ Chat | Comments              │ Design Files | resume.html  [×]   │
│                              ├───────────────────────────────────┤
│ Answers sent — agent is...   │ [↑] project                        │
│                              ├───────────────────────────────────┤
│ Done 54s 2216 in 80.22…      │                                   │
│                              │                                   │
│ You                          │      (sandboxed iframe             │
│ [form answers — direction]   │       artifact preview)            │
│ - Direction: modern-minimal  │                                   │
│                              │                                   │
│ Claude                       │                                   │
│ initializing claude-cpus-4-7 │                                   │
│ ...                          │                                   │
│                              │                                   │
│ [ToolCard: select.TodoWrite] │                                   │
│ [TodoCard: 6 items, 2/6]     │                                   │
│                              │                                   │
│ Working 5m 08s               │                                   │
│                              │                                   │
├──────────────────────────────┴───────────────────────────────────┤
│ Describe the design you want — paste or drop images, or @ a file │
│                                                                  │
│ [+ Import ▾]                                       [Stop]        │
└──────────────────────────────────────────────────────────────────┘
```

**组件树**：

```
<ProjectView projectId={...}>
  <AppChromeHeader />                <!-- 顶栏：back / 项目名 / Avatar -->
  <main className="grid grid-cols-[420px_1fr]">
    <ChatPane>
      <ChatHeader />                 <!-- Chat | Comments tab -->
      <MessageList>
        {messages.map(m => <MessageRenderer message={m} />)}
      </MessageList>
      <WorkingIndicator />           <!-- "Working 5m 08s" -->
      <ChatComposer />
    </ChatPane>
    <FileWorkspace>
      <WorkspaceTabs />              <!-- Design Files | artifact tabs -->
      <ActiveTabContent />           <!-- File tree 或 artifact iframe -->
    </FileWorkspace>
  </main>
</ProjectView>
```

### 7.3 Library 视图

`/library/skills`、`/library/design-systems`、`/library/examples` 都是 EntryView 的 tab 下抽取的独立路由，UI 风格一致：

- 顶部搜索 + 分类筛选 chip
- 卡片网格：缩略图 + 名称 + 1 行描述
- 点击进入详情：左侧元信息 + 右侧 live preview iframe

### 7.4 Settings Dialog

参照 `open-design/apps/web/src/components/SettingsDialog.tsx`。模态弹窗，左侧 section 列表 + 右侧内容：

| Section            | 内容                                                       |
| ------------------ | ---------------------------------------------------------- |
| General            | UI 语言 / 主题 / 默认 fidelity                              |
| Agents             | CLI 检测列表（启用 / 禁用）+ BYOK provider 多 key 配置     |
| Media providers    | 图像 / 视频 / 音频 provider 配置（v1.0 简历主要不需要，但保留接口） |
| Privacy            | 隐私协议确认状态 + 数据导出 / 删除                          |
| Connectors         | （v1.x）外部数据连接器                                     |
| About              | 版本 / 开源地址 / 许可证                                   |

---

## 8. 通用组件库

`apps/web/src/components/form/` 与 `apps/web/src/components/`，原则：薄、组合、token 驱动。

| 组件              | 文件                            | 用途                                          |
| ----------------- | ------------------------------- | --------------------------------------------- |
| `Button`          | form/Button.tsx                 | 主 / 次 / 虚线 / 图标按钮；sm/md/lg          |
| `Field`           | form/Field.tsx                  | label + helper + error 容器                   |
| `Input`           | form/Input.tsx                  | 单行                                          |
| `Textarea`        | form/Textarea.tsx               | 多行自动高度                                  |
| `Select`          | form/Select.tsx                 | 原生 select 包装                              |
| `Radio` / `Checkbox` | form/Radio.tsx              | 单选 / 多选                                   |
| `Toggle`          | form/Toggle.tsx                 | 开关                                          |
| `Slider`          | form/Slider.tsx                 | Tweaks 用                                     |
| `ColorPicker`     | form/ColorPicker.tsx            | Tweaks 用                                     |
| `Dialog`          | Dialog.tsx                      | 通用居中浮窗（Settings / Privacy / Paste）   |
| `Toast`           | Toast.tsx                       | 全局提示                                      |
| `EmptyState`      | EmptyState.tsx                  | 空状态                                        |
| `Loading`         | Loading.tsx                     | 骨架 / spinner                                |
| `Icon`            | Icon.tsx                        | lucide-react 包装                             |
| `Tag`             | Tag.tsx                         | section chip / 标签                           |
| `Tooltip`         | Tooltip.tsx                     |                                              |
| `Tabs`            | Tabs.tsx                        | 通用 tab 容器                                 |
| `QuickSwitcher`   | QuickSwitcher.tsx               | ⌘K 快速切换项目 / 文件                        |
| `LibrarySection`  | LibrarySection.tsx              | Skills / DS 共用的网格容器                    |

---

## 9. ChatPane 详解

### 9.1 MessageRenderer 分发

```tsx
function MessageRenderer({ message }: { message: ChatMessage }) {
  switch (message.kind) {
    case "user":           return <UserMessage m={message} />;
    case "assistant":      return <AssistantMessage m={message} />;
    case "tool_call":      return <ToolCard m={message} />;
    case "todo_update":    return <TodoCard m={message} />;
    case "question_form":  return <QuestionForm m={message} />;
    case "direction_pick": return <DirectionPicker m={message} />;
    case "option_card":    return <OptionCard m={message} />;
    case "confirm_card":   return <ConfirmCard m={message} />;
    case "diff_card":      return <DiffCard m={message} />;
    case "error":          return <ErrorBanner m={message} />;
    case "done":           return <DoneStamp m={message} />;
    default:
      const _exhaustive: never = message;
      throw new Error(`unknown message kind: ${_exhaustive}`);
  }
}
```

**封闭 switch 强制穷尽**：新增消息类型时编译失败，提示去补一个 case。

### 9.2 AssistantMessage（流式）

- 文本 chunk 通过 `sse/message_delta` 累加。
- markdown 渲染（react-markdown + 安全配置：禁用任意 HTML / 远程图片白名单）。
- 行内代码 / 代码块支持 syntax highlight。
- 段落末尾追加「光标」表示流式中。

### 9.3 ChatComposer

```tsx
<ChatComposer
  value={value}
  onChange={setValue}
  onSubmit={handleSubmit}
  onCancel={handleCancel}     // 工作中显示 Stop
  workingStatus={status}
  onImport={handleImport}     // + Import 下拉
  fileRefs={fileRefs}         // @ 触发的文件选择器
  agentPicker={<AgentMenu />} // 左下当前 agent
/>
```

**键盘**：
- `Enter`：换行
- `⌘/Ctrl+Enter`：发送
- `Esc`：清空输入
- `@`：触发文件选择器
- `/skill:<name>`：强制指定 skill（解析后传给 daemon）

---

## 10. Human-loop 卡片协议

### 10.1 通用 Card 接口

```ts
type CardBase = {
  id: string;
  conversationId: string;
  createdAt: string;
  status: "pending" | "responded" | "cancelled" | "expired";
  prompt: string;            // 卡片顶部描述
};

type QuestionFormCard = CardBase & {
  kind: "question_form";
  fields: Field[];
};
type Field = {
  key: string;
  label: string;
  type: "text" | "select" | "radio" | "checkbox" | "textarea";
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
  placeholder?: string;
};

type DirectionPickerCard = CardBase & {
  kind: "direction_pick";
  directions: Direction[];
  allowOverride: boolean;
};
type Direction = {
  id: string;
  name: string;
  thumbnail: string;   // base64 / 相对路径
  palette: string[];   // 4 色签名
  fonts: { display: string; body: string };
};

type OptionCardData = CardBase & {
  kind: "option_card";
  multiple: boolean;
  options: Array<{ value: string; label: string; description?: string }>;
};

type ConfirmCardData = CardBase & {
  kind: "confirm_card";
  actions: Array<{ value: "apply" | "reject" | "modify"; label: string; variant?: "primary" | "danger" | "secondary" }>;
};

type DiffCardData = CardBase & {
  kind: "diff_card";
  before: string;
  after: string;
  field: string;
  acceptLabel: string;
  rejectLabel: string;
};

type HumanLoopCard =
  | QuestionFormCard
  | DirectionPickerCard
  | OptionCardData
  | ConfirmCardData
  | DiffCardData;
```

### 10.2 响应流程

1. Daemon SSE 推 `event: card` → ChatProvider 把卡片插入消息流 + 加到 `pendingCards`。
2. 前端按 `kind` 渲染对应组件，本地维护用户填入的临时表单 state。
3. 用户点击「Submit / Apply / 选项」→ 前端 POST `/api/conversations/<id>/cards/<cardId>/respond` 带 payload。
4. Daemon 收到后转给 agent 作为新一轮 user 消息；继续 SSE 流。
5. 前端把卡片 status 标记为 `responded`，不可再操作。

### 10.3 不阻塞约束

- 用户可在卡片未响应时直接在 ChatComposer 打字发新消息：daemon 收到后会把未响应卡片标 `expired`，agent 拿到的是用户的新文字。
- 卡片有可选超时（默认 5 分钟），超时变灰但不删除。

### 10.4 新增卡片类型的步骤

1. `packages/contracts/src/chat.ts` 加 union 变体。
2. 后端 `apps/daemon/src/cards/` 加发布逻辑。
3. 前端：
   - `MessageRenderer` switch 加一个 case（编译期强制提示）。
   - 新写 `<XxxCard>` 组件文件。
4. 测试：单元测试该卡片渲染 + 响应。

---

## 11. TodoCard / ToolCard / AssistantMessage

### 11.1 TodoCard

参照 `open-design/docs/screenshots/04-todo-progress.png` 的 TODOS 卡：

```
┌────────────────────────────────────────┐
│ TODOS                            2/6   │
├────────────────────────────────────────┤
│ ✓ Reading project README and docs...   │
│ ✓ Plan 10-slide arc with rhythm...    │
│ ● Build deck framework: 1920×1080...  │  ← in_progress 高亮
│ ○ Write all 10 slides with Swiss...   │
│ ○ Run P0 checklist + 5-dim critique... │
│ ○ Emit single <artifact>              │
└────────────────────────────────────────┘
```

- 状态图标：`completed` ✓ 蓝 / `in_progress` ● 蓝 / `pending` ○ 灰 / `cancelled` ⊘ 灰删除线。
- 当前进度条：`completed / total`。
- 折叠态只显示总进度，点击展开看全部。

### 11.2 ToolCard

```
┌────────────────────────────────────────┐
│ 🔧 ToolSearch · select.TodoWrite       │
│                                done ✓  │
└────────────────────────────────────────┘
```

- 折叠态：工具名 + 状态。
- 展开态：参数 JSON（语法高亮）+ 输出（截断 + 「展开」按钮）。
- 长输出（>500 行）默认不展开，提供「下载完整输出」按钮。

### 11.3 AssistantMessage

- markdown 渲染，统一段间距。
- 行内代码 `mono` + `surface-muted` 底。
- 块级代码用 `<pre>` + 复制按钮。
- 图片 / 链接根据安全策略过滤。

---

## 12. FileWorkspace 详解

### 12.1 顶部 Tabs

参照 `open-design` 的 Design Files / index.html / artifact 多 tab：

```
[Design Files] [resume.html ×] [resume.json ×] [+]
```

- 第一个 tab 「Design Files」固定不可关闭，显示文件树 + drop zone。
- 每个 artifact 作为可关闭 tab；右上 `×`。
- `+` 按钮可手动新建文件。

### 12.2 Design Files Tab

```
┌──────────────────────────────────────────────┐
│ [↑] project                  [New sketch] [Paste] [Upload] │
├──────────────────────────────────────────────┤
│                                              │
│  ↓ DROP FILES HERE ↓                         │
│  Images, docs, references, Figma links...   │
│                                              │
│  📄 resume.json                              │
│  📄 resume.html              v3              │
│  📄 styles.css                               │
│  🖼 preview.png                              │
│  📁 references/                              │
│     └ jd-anthropic-2026.pdf                  │
└──────────────────────────────────────────────┘
```

- 文件树平铺 + 子文件夹折叠。
- 点击文件 → 在右侧新开 / 切换到对应 tab。
- 拖入文件 → 上传到 daemon → 触发 agent reading。

### 12.3 Artifact Tab

参照 `open-design` 的 `05-preview-iframe.png`：

```
┌────────────────────────────────────────────────────────────┐
│ [Preview] [Source] [Comment] [Edit] [Draw] [- 100% +] [Share ▾] │
├────────────────────────────────────────────────────────────┤
│  ◯ Tweaks                                                   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│              (Sandboxed iframe srcdoc)                     │
│              Resume Preview Rendering                      │
│                                                            │
│                                              01 / 10       │
└────────────────────────────────────────────────────────────┘
```

#### 12.3.1 模式切换

| 模式      | 描述                                                                                          |
| --------- | --------------------------------------------------------------------------------------------- |
| Preview   | sandboxed iframe 渲染最终 artifact                                                            |
| Source    | Monaco / CodeMirror 显示 HTML 源码（只读）                                                    |
| Comment   | 在 preview 上点击位置加批注（v1.x，v1.0 占位）                                                |
| Edit      | 同 Source 但可编辑；保存后写回 daemon + 触发 agent 读取                                       |
| Draw      | 在 preview 上画涂鸦标注（v1.x，v1.0 占位）                                                    |

#### 12.3.2 Sandboxed iframe

```ts
<iframe
  srcDoc={html}
  sandbox="allow-same-origin"      // 不 allow-scripts，不 allow-top-navigation
  className="w-full h-full bg-white"
  ref={iframeRef}
/>
```

**安全策略**：

- 禁用脚本（`sandbox` 不含 `allow-scripts`）。
- 禁止远程资源（HTML 渲染前 daemon 已过滤 `<script>` / 远程 `<img>` / `<link rel="stylesheet" href="http...">`）。
- 字体通过 `data:` URI 或 daemon 代理 inline。

#### 12.3.3 Tweaks 面板

- 开关切到 Tweaks：agent 暴露的 `tweakable_params` 渲染为 slider / color picker / select。
- 调整即时通过 POST `/api/conversations/<id>/tweak` 写回，agent 收到后只重渲染 artifact 不重写文案。

### 12.4 工作区文件 R/W 边界

- 前端只能通过 daemon HTTP API 操作文件；不直接 fetch 本地路径。
- 文件名 + 路径校验由 daemon 完成（仅允许项目目录内）。

---

## 13. AgentPicker

### 13.1 入口

- **EntryView 底部**：显示当前 agent + 「切换」按钮。
- **ChatComposer 左下**：紧凑形态，点击展开浮层。

### 13.2 浮层结构

```
┌──────────────────────────────────────────────┐
│  Local CLIs                                  │
│  ● Claude Code · 2.1.121 [healthy]    ←active│
│  ○ Codex CLI · 0.8.2     [healthy]            │
│  ○ Cursor Agent · 0.4    [not installed]      │
│  ○ Gemini CLI · 0.3      [not installed]      │
│                                              │
│  BYOK Providers                              │
│  ○ Anthropic · claude-sonnet-4-6 [configured]│
│  ○ OpenAI · gpt-4o-mini         [not set]    │
│  ○ Azure OpenAI                  [not set]    │
│  ○ Google Gemini                 [not set]    │
│                                              │
│  [⚙ Configure...] (开 Settings/Agents tab)   │
└──────────────────────────────────────────────┘
```

- 当前选中加蓝色 brand 圆点。
- 未配置项可点击直接跳 Settings 对应表单。

### 13.3 切换语义

- 切换不影响当前对话上下文（消息历史完整保留）。
- 下一条 user 消息开始使用新 agent；agent 可能因模型差异给出不同风格的响应。

---

## 14. Skills 与 Design Systems 库

### 14.1 Skills 库

- `LibrarySection` 组件作为壳；卡片按 `rs:scenario` 分组。
- 每张卡：缩略图 + 名称 + 1 行描述 + 「在新项目中使用」按钮。
- 点进详情：
  - 左栏：SKILL.md 渲染（markdown）+ 元数据表
  - 右栏：`example.html` 在 sandboxed iframe 中渲染
  - 顶部「+ New Project with this skill」一键新建项目时预选该 skill

### 14.2 Design Systems 库

- 类似 Skills 库但卡片显示 4 色签名 + 字体名。
- 详情页：左栏 DESIGN.md + swatch grid + 字体预览，右栏 live showcase（用一个示例 resume 渲染）。

### 14.3 用户加载本地 skill / system

- 用户把 `<name>/` 文件夹放到 `appData/Resume Studio/skills/` 或 `.../design-systems/`，daemon 启动时扫描合并。
- Library 中显示「Local」徽标区分。

---

## 15. Settings Dialog

### 15.1 总体形态

参照 `open-design/apps/web/src/components/SettingsDialog.tsx`，模态 + 左侧 section 列表 + 右侧内容。

### 15.2 各 Section 内容

| Section          | 关键字段                                                                            |
| ---------------- | ----------------------------------------------------------------------------------- |
| General          | UI 语言（zh-CN / en-US）/ Theme（Light / Dark / System）/ 默认 fidelity            |
| Agents           | CLI 检测列表（启用 / 禁用 toggle）+ BYOK 4 provider 表单（baseUrl / apiKey / model）|
| Privacy          | 隐私确认状态 + 数据导出（导出全部项目 ZIP）+ 数据删除（清空 SQLite）              |
| Data             | 数据目录路径显示 + 「打开目录」+「迁移目录」                                       |
| Connectors       | v1.x 预留（外部连接器：LinkedIn / GitHub）                                          |
| Media providers  | v1.x 预留                                                                           |
| About            | 版本号 / 构建时间 / 开源地址 / 许可证                                              |

### 15.3 BYOK 表单

```
Anthropic
  ┌──────────────────────────────────────┐
  │ Base URL  https://api.anthropic.com  │
  │ API Key   [●●●●●●●●●●]   [Test]      │
  │ Model     claude-sonnet-4-6  ▾       │
  └──────────────────────────────────────┘
```

- 「Test」按钮：POST `/api/agents/byok/test` → 返回 success / 失败原因。
- 保存时 key 写到 daemon → daemon 写 keyring；前端不持久化 key。

---

## 16. i18n

### 16.1 文件结构

```
apps/web/src/i18n/
├── index.tsx     LocaleProvider, useT, StringKey 推导
├── zh.ts         中文字典（无 as const，保持类型可扩展）
└── en.ts         英文字典（与 zh 同 shape）
```

### 16.2 类型安全的 key

```ts
type StringKey = DotKeys<typeof zh>;
// "chat.composer.placeholder" | "entry.newProject.create" | ...
```

任何字符串拼接禁止，必须经 `t(key)`。

### 16.3 UI 语言 vs 简历 locale

- **UI 语言**：`LocaleProvider` 状态，影响 `t()`。
- **简历 locale**：`project.locale`，影响 agent 输出 / 模板默认文案 / 字体栈。
- 两者完全独立。UI 中文用户可以编辑英文简历。

### 16.4 新增语言

1. 复制 `zh.ts` 为新 locale，逐 key 翻译。
2. `LocaleProvider` 注册。
3. Settings 下拉自动出现。

---

## 17. 主题 token 与样式

### 17.1 来源

`apps/web/tailwind.config.ts` 直接映射 `.pen` token；任何视觉调整：

1. 改 `.pen`
2. 同步 `tailwind.config.ts`
3. 不在组件 hardcode 颜色字面量

### 17.2 阴影系统

```ts
boxShadow: {
  card:      "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)",
  cardHover: "0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)",
  modal:     "0 24px 48px rgba(0,0,0,0.12)",
}
```

### 17.3 暗色模式

v1.x。预留 `dark:` 前缀，未来补全。

---

## 18. 错误与状态机

### 18.1 项目级状态

```ts
type ProjectStatus =
  | "loading"       // 切到 ProjectView，等待初始 state
  | "ready"         // 可交互
  | "working"       // agent 正在工作
  | "error"         // 加载失败
  | "reconnecting"  // SSE 断开重连中
```

### 18.2 错误展示策略

| 错误类型           | 展示位置                         | Toast |
| ------------------ | -------------------------------- | ----- |
| 项目加载失败       | 全屏中心消息 + Retry             | ✗     |
| Agent 启动失败    | Chat 内 `error` 消息 + Retry     | ✓     |
| Agent 输出错误     | Chat 内 `error` 消息             | ✗     |
| Card 响应失败      | Card 内显示错误 + Retry          | ✗     |
| 文件上传失败       | Toast + 文件区错误提示           | ✓     |
| Daemon 不可达      | 顶栏黄色横幅 + Retry             | ✓     |
| 导出失败           | Toast + 详情对话框               | ✓     |

### 18.3 SSE 重连

```ts
function reconnectWithBackoff() {
  let attempts = 0;
  const delays = [500, 1000, 2000, 5000, 10000];
  // 状态切到 "reconnecting"；UI 显示横幅
}
```

---

## 19. 测试策略

### 19.1 单元（Vitest）

- 每个 reducer action 独立 case。
- 每个 MessageRenderer 分支：mock 消息 → 渲染断言。
- Human-loop 卡片：渲染 + onSubmit 回调。
- SSE parser：mock event 流 → action 序列。

### 19.2 组件集成（Vitest + Testing Library）

- ChatPane：发消息 → 流式 chunk → todo 更新 → 卡片插入 → 用户响应。
- FileWorkspace：tab 切换 / 文件上传 / iframe 渲染 srcdoc 校验。
- AgentPicker：切换 → 下条消息使用新 agent。

### 19.3 端到端（Playwright）

参照 `open-design/e2e/`，关键场景：

| Journey                              | 步骤覆盖                                                          |
| ------------------------------------ | ----------------------------------------------------------------- |
| 新建 → 简单 chat → emit → 导出       | EntryView 新建 / 发消息 / 收 artifact / 点 Download / 校验文件    |
| Card 响应回路                        | mock daemon SSE 推 card → 渲染 → 提交 → 校验 POST 调用             |
| Agent 切换                           | 切换 agent → 发消息 → 校验 daemon 收到的 agent 参数               |
| 中断 + 重连                          | 断开 daemon → 显示横幅 → 恢复后续传                                |
| 双语切换                             | 切换 UI 语言 → 校验关键文案                                       |

### 19.4 视觉回归

- 关键页面截图 baseline + diff（pixel diff）。
- artifact iframe 输出与基线比较。

---

## 20. Roadmap（slice 切分，与 PRD §13 对齐）

| Slice | 前端范围                                                                                                                            |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 0     | apps/web bootstrap（Next.js 16 + Tailwind + i18n shell + router + 三大 Provider 骨架）                                              |
| 1     | EntryView（NewProjectPanel + DesignsTab + 项目 CRUD UI）+ Settings shell                                                            |
| 2     | ProjectView shell（ChatPane + ChatComposer + 简单 user/assistant 消息渲染 + SSE 接入）                                              |
| 3     | TodoCard + ToolCard + FileWorkspace shell（Design Files tab + artifact iframe sandbox）                                            |
| 4     | Human-loop 5 类卡片：QuestionForm / DirectionPicker / OptionCard / ConfirmCard / DiffCard                                          |
| 5     | Skills 库（LibrarySection + 详情 + agent 自动 / `/skill:` 手动）                                                                    |
| 6     | Design Systems 库（同上）+ Chat 内切换体验                                                                                          |
| 7     | AgentPicker（CLI 检测列表 + BYOK 表单 + Test）+ PrivacyConsentModal                                                                  |
| 8     | Export UI：ExportDialog + 6 格式选择 + 系统保存对话框集成                                                                            |
| 9     | Import UI：drop zone + 4 种来源（Claude Design ZIP / JSON Resume / FlowCV / PDF）+ 进度条 + 校对卡                                  |
| 10    | i18n 完整 UI + 简历 locale 切换 + 双语 artifact 切换 + Settings 完整版（数据目录迁移 / keyring 表单）                              |
| 11    | Tweaks 面板 + Source/Edit 切换 + 多 artifact 版本管理 + AgentPicker 新增 CLI（Cursor / Gemini）+ BYOK 表单扩展（OpenAI / Azure / Gemini）|
| 12    | 视觉回归 + Playwright E2E + 性能优化 + QuickSwitcher（⌘K）+ 错误提示打磨 + GA 打包                                                  |

---

## 21. 不做的事（明确边界）

- 不引入 Redux / Zustand / Jotai。
- 不引入 CSS-in-JS（统一 Tailwind）。
- 不在前端写 LLM client；所有 agent 调用走 daemon。
- 不在前端做 PDF 渲染；走 daemon。
- 不写桌面端原生 IPC 逻辑（Electron 在 v1.x，且参照 open-design `apps/desktop/` 的 sidecar IPC 模式）。
- 不实现暗色模式（v1.0）。
- 不引入 GraphQL；HTTP + SSE 已足够。

---

## 22. 与 Open Design 的关系

- 工程实践全面参照 `open-design/`，但实际代码独立开发，不直接拷贝（除组件命名与目录结构上的对应）。
- 公共类型（`packages/contracts`）可以参考 Open Design 的 sse / chat / artifact 类型作为蓝本，但简历专属字段（如 `rs:industry`、`Resume` 数据 schema）我们自定。
- 简历专属的 18-25 个 skill 与 12-20 套 design system 是我们自己写，**不依赖 Open Design 仓库**。

**真理来源声明**：本 spec 的视觉以 `docs/prototype/resume-design.pen` 为准，UI 形态以 `open-design/apps/web/` 截图与组件命名为参照；本 spec 与两者不一致时，以 `.pen` 视觉 + `open-design` 形态优先，并触发本 spec 修订。
