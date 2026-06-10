# Resume Studio — 产品需求文档（PRD）

| 字段     | 内容                                                                              |
| -------- | --------------------------------------------------------------------------------- |
| 文档版本 | v2.0                                                                              |
| 创建日期 | 2026-06-11                                                                        |
| 状态     | Draft（待用户审阅）                                                               |
| 设计来源 | `docs/prototype/resume-design.pen` + 参照 `open-design/`（Claude Design 开源对标） |
| 关联文档 | `2026-06-11-resume-studio-frontend-design.zh.md`、`2026-06-11-resume-studio-backend-design.zh.md` |
| 取代     | `2026-06-10-resume-product-prd.zh.md`（Tauri 编辑器方向，已 SUPERSEDED）          |

---

## 0. 修订记录

| 版本 | 日期       | 修订人 | 说明                                                                |
| ---- | ---------- | ------ | ------------------------------------------------------------------- |
| v1.0 | 2026-06-10 | claude | 初稿 — Tauri 桌面编辑器方向（已 SUPERSEDED）                       |
| v2.0 | 2026-06-11 | claude | 重写 — Agent + Skills + Sandboxed Artifact 方向，对齐 Claude Design |

---

## 1. 摘要

### 一句话定位

**Resume Studio 是 Claude Design 的简历垂直版**：单一 Chat 主屏，用户用自然语言写草稿或粘贴现有内容，Agent 通过可组合的 **Skills** 与 **Design Systems**，把草稿"编译"为可沙盒渲染的简历 Artifact（HTML / PDF / DOCX），并在 Chat 流里用 Human-in-the-loop 选项卡（QuestionForm / DirectionPicker / OptionCard / ConfirmCard）与用户讨论调整。

### 关键差异点

| 维度                | 通用工具（FlowCV / Resume.io） | 通用 AI（Claude Design） | **Resume Studio**            |
| ------------------- | ------------------------------- | ------------------------- | ---------------------------- |
| 形态                | 表单 + 模板                     | Chat + 通用设计           | **Chat + 简历专属 Agent**    |
| 数据存放            | 云端                            | 云端                      | **本地优先**                 |
| Agent               | 弱（部分 SaaS 有）              | 通用                      | **简历 vertical 专属 Agent** |
| Skills              | 无                              | 通用（31 个）             | **简历专属 18-25 个**         |
| Design Systems      | 模板（数十）                    | 通用（72-129 个）         | **行业相关 12-20 套**         |
| BYOK / CLI 双轨    | 无                              | 仅托管                    | **BYOK + 本地 CLI 双轨**     |
| 开源                | 闭源                            | 闭源                      | **Apache-2.0**               |

**核心护城河**：**Agent + Skills 工程**。我们不重写 LLM，我们重写「**对话该长什么样，工具该怎么编，简历该被怎么编译**」。

### 核心心智模型

```
              ┌─────────────────────────────────────────────┐
              │  Chat 是唯一交互主屏                          │
              │  Agent 主导，Human-in-the-loop 卡片随插随取   │
              └─────────────────────────────────────────────┘
                            │
        ┌───────────────────┼────────────────────┐
        ▼                   ▼                    ▼
┌────────────┐       ┌────────────┐       ┌────────────┐
│  Skills    │       │  Design    │       │  Agent     │
│  (rs:)     │       │  Systems   │       │  Runtime   │
│  18-25 个  │       │  12-20 套  │       │  CLI+BYOK  │
└────────────┘       └────────────┘       └────────────┘
        │                   │                    │
        └───────────────────┼────────────────────┘
                            ▼
              ┌─────────────────────────────────────────────┐
              │  Sandboxed Artifact（iframe）                │
              │  HTML / PDF / DOCX / Markdown / JSON 导出   │
              └─────────────────────────────────────────────┘
```

---

## 2. 背景与机会

### Claude Design 的引爆

Anthropic 于 2026-04-17 随 Opus 4.7 发布 **Claude Design** —— 第一个让 LLM 不再「写散文」、而是「输出可渲染设计 artifact」的产品。它证明了一个范式：

- **Artifact-first**：模型输出不是文本回答，而是可即时渲染的成品。
- **Sandboxed preview**：每个 `<artifact>` 在隔离的 iframe 中渲染，所见即所得。
- **Skill-driven**：模型行为由可组合的 skill 包驱动，而不是「无上下文的 prompt」。
- **Discovery loop**：通过 Turn-1 问询卡片在 chat 内锁定 brief，避免模型空想。

但 Claude Design 闭源、付费、云端独占，锁定 Anthropic 自家模型与 skill 集。

### Open Design 的开源化

`/Users/quan/MyFile/CodeProject/resume_design/open-design/` 是 Claude Design 的开源对标：本地优先、Web 可部署、BYOK at every layer，16 个 CLI agent 自动检测 + BYOK proxy 兜底。架构成型：**Web (Next.js) + 本地 Daemon (Node) + Skills 目录 + Design Systems 目录 + Sandboxed iframe artifact**。

我们直接**借鉴 Open Design 的工程架构与交互模式**，但产品聚焦到**简历这一个 vertical**。

### 简历是高价值低 friction 的 vertical

- **高价值**：每个求职者每年至少 1 次需要重写简历，跨境 / 转行用户需求频率更高。
- **低 friction**：简历产出周期短（30 分钟–几小时），用户对 AI 工具的接受度高。
- **垂直专属空间**：通用设计工具难以理解「ATS」「行业适配」「中英双语数据同源」等简历独有的痛点。
- **Skill 工程是护城河**：通用 LLM 写简历都能写，**「写得专业」「视觉一致」「ATS 友好」「行业懂行」是简历专属 skill 集解决的**。

---

## 3. 核心心智模型

### 3.1 Agent

**Agent 不是新写的 LLM 客户端，而是「调度器 + Prompt 工程师」**：

- 用户**本地已装的 CLI agent**（Claude Code / Codex / Cursor Agent / Gemini CLI / OpenCode 等）通过 PATH 自动检测，daemon spawn 子进程执行。
- 用户**无 CLI** 时走 **BYOK proxy**（Anthropic / OpenAI / Azure / Google Gemini），daemon 转发 SSE 流。
- Agent 的「智能」来自 prompt + skills + design-systems，而不是模型本身。

### 3.2 Skills

**每个 skill 是 `skills/<name>/SKILL.md` 文件夹**（参照 Claude Code SKILL.md 协议 + 自定 `rs:` 简历专属 frontmatter）：

```yaml
---
name: resume-modern-tech
description: 现代科技公司岗位的简历生成（双列 + 系统字体 + 蓝色主色）
rs:
  mode: resume
  industry: tech
  target_role: ["engineer", "pm", "designer"]
  fidelity: high
  default_for_industry: tech
  ats_target: high
  example_prompt: 帮我做一份给 Anthropic Sonnet 工程师岗位的简历
preview:
  type: html
  thumbnail: preview.png
---

# Resume — Modern Tech

[skill 正文：风格规则 / 段落结构 / 字体栈 / 必备 section / ATS 兜底]
```

V1.0 简历专属 skill 集合（18-25 个）：

- **风格类**（6-8）：`resume-classic` / `resume-modern-tech` / `resume-editorial-academic` / `resume-bold-creative` / `resume-warm-personal` / `resume-brutalist-bold` / `resume-swiss-minimal` / `resume-bilingual-cn-en`
- **能力类**（8-10）：`bullet-polish` / `summary-rewrite` / `experience-extract`（从粘贴的草稿中识别条目）/ `cover-letter-draft` / `ats-optimize` / `jd-tailoring`（针对特定 JD 调整）/ `critique`（5 维自评）/ `translate-cn-en` / `industry-deep-dive`（针对 tech/finance/design/healthcare 等行业的专属术语注入）
- **辅助类**（4-6）：`photo-suggest` / `link-curate` / `highlight-metric`（量化句改写）/ `length-tighten` / `length-expand`

### 3.3 Design Systems

**每个 design system 是 `design-systems/<name>/DESIGN.md`**（参照 Open Design 的 DESIGN.md 协议）：

- 4 色签名 + 字体栈（中英文分开）+ 间距规则 + 圆角 token + 视觉范例
- V1.0 行业相关子集（12-20 套）：
  - **科技**：`anthropic-style` / `apple-style` / `stripe-style` / `linear-style` / `notion-style`
  - **金融**：`bb-style`（投行报告风）/ `swiss-financial`
  - **设计**：`figma-style` / `dribbble-editorial`
  - **学术**：`editorial-monocle`（学术 / 出版）/ `swiss-academic`
  - **创意**：`brutalist-bold` / `warm-soft-personal` / `magazine-style`
  - **通用**：`neutral-modern` / `classic-serif` / `minimal-mono`

### 3.4 Artifact

- Agent 在 chat 流里输出 `<artifact>` 标签，类型 = `text/html`（简历主体）+ 附件文件（`resume.json` 数据、`styles.css`、`preview.png` 缩略图）。
- 前端把 artifact 渲染到右栏 sandboxed iframe（`srcdoc` + `sandbox="allow-same-origin"`）。
- Artifact 可 inline-edit（File workspace 中 Source/Edit 切换）+ 多版本 tabs。

### 3.5 Human-in-the-loop 卡片

Chat 内的特殊消息类型，agent 通过特定 tool 调用触发，**前端识别后渲染为可交互卡片**而不是纯文本：

| 卡片类型         | 用途                                    | 用户操作            | 回传形态                  |
| ---------------- | --------------------------------------- | ------------------- | ------------------------- |
| `QuestionForm`   | 多字段问询（行业 / 目标岗位 / 经验年限）| 填写后 Submit       | 一条 JSON 消息 + 表单字段 |
| `DirectionPicker`| 从 N 个 visual direction 中选 1         | 单选 + 可选 Override | 一条消息 + direction id   |
| `OptionCard`     | 单选 / 多选简单选项                     | 点选                | 一条消息 + 选项 id        |
| `ConfirmCard`    | 二元确认（应用 / 拒绝 / 改）             | 三态按钮             | 一条消息 + 决策           |
| `DiffCard`       | 改写前后对比，用户选「接受 / 拒绝」     | 二态按钮             | 一条消息 + 决策           |

**关键规则**：Agent 自主决定何时插入卡片；用户也可在输入框直接打字，跳过等待卡片选择。卡片**不阻塞** chat 流，用户随时可发新消息打断。

---

## 4. 目标用户

### Persona A：应届毕业生「小林」

- 22 岁，无社会经验，第一次写简历。
- 痛点：不知道写什么、模板太丑、英文不熟。
- 行为：在 chat 输入「我是 985 计算机应届，做过两个课程项目，找互联网后端实习」，agent 用 `QuestionForm` 问清岗位 + 学校，调 `resume-modern-tech` skill + `linear-style` design system，生成 artifact。
- 优先级：**易用性 > AI 自主性 > 视觉好看**。

### Persona B：中级软件工程师「Quan」

- 28 岁，工作 5 年，跳槽 2 次。
- 痛点：维护中英双语简历同步麻烦，每次投递要针对岗位调整关键词。
- 行为：已有中文简历草稿，让 agent 调 `translate-cn-en` + `resume-bilingual-cn-en` 出英文版；针对每个 JD 调 `jd-tailoring` + `ats-optimize`。
- 优先级：**多语言 > ATS > 数据可控**。

### Persona C：高级专业人士「李博士」

- 38 岁，海外学者。
- 痛点：履历包装成多种侧重（教职 / 企业 / 咨询）。
- 行为：从同一份草稿出发，让 agent 用不同 skill 组合（`industry-deep-dive` 注入不同行业术语）生成三个 artifact 版本，并存为三个项目。
- 优先级：**Skill 组合表达力 > 多版本管理**。

### Persona D：设计敏感型用户「Aria」

- 30 岁，设计岗。
- 痛点：通用工具排版死板。
- 行为：用 `ConfirmCard` 反复对每一个细节决策投票（"主色这个蓝够不够 brutal？"），agent 用 `tweaks` skill 暴露可调参数。
- 优先级：**Customize 颗粒度 > AI 引导**。

---

## 5. 业务目标与成功指标

### 北极星指标

**完成首份简历 artifact 导出的用户占比（D7 内）** ≥ 65%。

### 核心 KPI

| 维度                  | 指标                                                       | 目标（v1.0 GA 半年内） |
| --------------------- | ---------------------------------------------------------- | ---------------------- |
| 激活                  | D1 创建并 emit ≥ 1 个 artifact                              | ≥ 80%                  |
| 完成度                | 平均每份简历 chat 轮数                                     | ≥ 6                    |
| Agent 任务完成率       | Agent 自宣称完成的 todo 中实际产出 artifact 的占比         | ≥ 90%                  |
| Artifact 接受率        | Artifact 产出后 30 秒内未触发"重做"的占比                  | ≥ 65%                  |
| Human-loop 卡片有效率 | 用户操作而非忽略的卡片占比                                 | ≥ 80%                  |
| BYOK 渗透             | 启用 BYOK proxy 的用户占比                                 | ≥ 60%                  |
| CLI 渗透              | 检测到本地 CLI 并使用的用户占比                            | ≥ 30%                  |
| 多语言渗透            | 同时维护两种语言版本的用户占比                             | ≥ 20%                  |
| 导出成功率            | PDF / HTML 导出端到端成功率                                | ≥ 99%                  |
| 留存                  | D30 回访率                                                 | ≥ 35%                  |

---

## 6. 产品范围

### In Scope（v1.0 完整产品）

- **Entry view**：项目列表 + 新建项目面板。
- **Chat 主交互屏**：消息流 + TodoWrite 卡 + ToolCard + Human-loop 卡片（QuestionForm / DirectionPicker / OptionCard / ConfirmCard / DiffCard） + ChatComposer。
- **Sandboxed artifact iframe** + File Workspace（多 tab、Source/Preview/Edit 切换）。
- **Agent Runtime**：本地 CLI 自动检测（Claude Code / Codex / Cursor Agent / Gemini CLI 至少 4 个）+ BYOK proxy（Anthropic / OpenAI / Azure / Google Gemini）。
- **Skills 库**：v1.0 简历专属 18-25 个；用户可手动浏览覆盖。
- **Design Systems 库**：v1.0 行业相关 12-20 套；用户可手动浏览覆盖。
- **持久化**：本地 SQLite（`appData/Resume Studio/app.sqlite`），存项目 / 对话 / 消息 / artifact 版本 / 偏好。
- **导入**：Claude Design ZIP / FlowCV JSON / JSON Resume / PDF 简历（OCR + agent 结构化）/ 粘贴文本。
- **导出**：HTML / PDF / DOCX / Markdown / JSON / ZIP（含 artifact + 数据）。
- **i18n**：UI 语言（zh-CN / en-US）+ 简历内容 locale（独立切换）。
- **隐私显式化**：BYOK 调用前明确提示数据流向；CLI 调用同样提示。

### Out of Scope（v1.0 不做）

- 云端账户 / 跨设备同步 / 协作编辑。
- 模板付费市场 / 交易系统。
- 移动端原生 app。
- 16 个 CLI 全支持（v1.0 优先 4 个最主流的）。
- 自定义 skill 编辑器（v1.0 用户只能浏览 + 应用，编辑 skill 仍是 dev 改文件）。
- 自定义 design system 编辑器（同上）。
- 简历投递追踪 / 面试模拟 / 岗位推荐。
- LinkedIn / FlowCV 双向同步（仅单向导入）。

---

## 7. 用户角色与权限

v1.0 单机单用户，本地 SQLite。不存在多角色概念。

- 简历数据：用户 `appData/Resume Studio/` 完整权限。
- BYOK API Keys：存系统 keyring（macOS Keychain / Windows Credential Manager / Linux libsecret），与 SQLite 物理隔离。
- 项目 workspace 文件：daemon 仅在 `appData/Resume Studio/projects/<id>/` 内读写，跨项目调用被拒。

---

## 8. 关键用户旅程

### Journey 1：第一次使用 → 导出第一份简历

```
启动 App
  → Entry view：空列表，点「+ 新建」
  → 新建面板：项目名 "我的第一份简历" + Design System "(让 AI 选)" + Fidelity "High"
  → 进入 ProjectView（chat + workspace 两栏）
  → 输入框打字："我是 985 计算机应届，做过两个课程项目，找互联网后端实习"
  → Agent 启动：流式输出 TodoWrite 卡（5 步计划）
  → Agent 调 critique skill 评估输入；插入 QuestionForm 卡：「你的目标岗位语言是中文还是英文？目标公司行业？」
  → 用户填表 Submit
  → Agent 选 resume-modern-tech + linear-style，开始 write resume.html
  → Sandboxed iframe 渲染 artifact；右栏 tab 切到 resume.html
  → Agent 总结："已完成。是否要 ATS 评估？" + ConfirmCard
  → 用户点「跳过」
  → 点 TopBar Download → 选 PDF → 系统保存对话框 → 完成
```

**成功标准**：D1 用户中 ≥ 80% 完成至少一次「新建 → 导出」闭环。

### Journey 2：维护中英双语版本

```
已有中文简历项目「Resume-中」
  → Entry view → 该卡片右上 ⋯ → 「复制」→ 命名「Resume-EN」
  → 进入 ProjectView，输入框：「把这份转成英文版，目标 Anthropic Sonnet 工程师岗」
  → Agent 调 translate-cn-en + resume-bilingual-cn-en
  → 流式输出 DiffCard 逐段对比（中文原文 vs 英文改写）
  → 用户对每段 DiffCard 选「接受」或「改」
  → 全部接受后导出 PDF（英文版）
  → Entry view 两个项目并存
```

### Journey 3：针对岗位 ATS 优化

```
已有简历项目，输入框粘贴 JD 全文
  → Agent 调 ats-optimize + jd-tailoring
  → 输出 ATS 报告（artifact 类型 = ATS Report）：4 维评分 + 关键词覆盖 + 缺失列表
  → 在 chat 末尾插入 OptionCard：「要不要按建议直接改？也可逐条挑」
  → 用户选「逐条挑」
  → Agent 每条建议发一个 DiffCard
  → 全部处理完后重新评分
```

### Journey 4：从 PDF 旧简历起步

```
Entry view → 「+ 新建」→ 在新建面板选「从文件导入」→ 拖入旧 PDF
  → Daemon 触发 PDF OCR → 文本流给 agent
  → Agent 调 experience-extract skill，从 OCR 文本中结构化抽取
  → 流式输出 QuestionForm 卡：「这 3 段 OCR 看起来像是同一公司经历，对吗？」
  → 用户确认 → Agent 整理为 resume.json + resume.html 双 artifact
  → 用户在 chat 里说「调整为现代风格」→ Agent 调 design-system 切换
```

---

## 9. 功能模块需求

### 9.1 Entry View（项目列表 + 新建）

**优先级**：P0

| ID    | 功能                  | 描述                                                                                                       | 验收要点                                                |
| ----- | --------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| EV-01 | 项目列表              | 卡片网格：项目名 + design system 标签 + 最近编辑时间 + 缩略图（artifact 渲染快照）                         | 空状态显示「+ 新建」「导入」CTA                         |
| EV-02 | 顶部 Tabs             | Designs / Examples / Design Systems / Skills（参照 open-design `EntryView.tsx`）                          | Tab 切换持久化到 URL                                    |
| EV-03 | 新建面板              | 左侧固定面板：项目名 + Design System Select + Fidelity（Wireframe / High fidelity）+「+ Create」          | Design System 可选「让 AI 选」（不预设）                |
| EV-04 | 导入                  | 「Import」按钮 → 支持 Claude Design ZIP / JSON Resume / FlowCV JSON / 粘贴文本 / PDF                       | 导入后自动进入 ProjectView                              |
| EV-05 | 项目操作              | 卡片右上 ⋯ 菜单：重命名 / 复制 / 删除 / 在 Finder 中显示                                                   | 删除走系统回收站                                        |
| EV-06 | 底部状态              | 显示当前选中 agent（"Local CLI · Claude Code · 2.1.121" 或 "BYOK · Anthropic · Sonnet 4-6"）+ 语言切换    | 一键切换 agent                                          |
| EV-07 | 排序与筛选            | 默认按最近编辑倒序；支持按 design system / locale / fidelity 过滤                                          | 偏好持久化                                              |

### 9.2 Chat 主交互屏（ProjectView）

**优先级**：P0  
**布局**：左栏 ChatPane + 右栏 FileWorkspace（参照 `open-design/apps/web/src/components/ProjectView.tsx`）

#### 9.2.1 消息类型

| 类型             | 来源        | 渲染形态                                                                  |
| ---------------- | ----------- | ------------------------------------------------------------------------- |
| `user`           | 用户        | 普通文本气泡，右对齐                                                      |
| `assistant`      | Agent       | 流式追加的文本气泡，markdown 渲染                                         |
| `tool_call`      | Agent       | `ToolCard` 卡片：工具名 + 参数预览 + 状态（pending / done / error）       |
| `todo_update`    | Agent       | `TodoCard`：todo 列表 + 完成进度（与 Claude Code TodoWrite 协议同）       |
| `question_form`  | Agent       | `QuestionForm` 卡：N 个字段，Submit 后转换为 user 消息回传                |
| `direction_pick` | Agent       | `DirectionPicker` 卡：N 个 visual direction 缩略图 + 单选 + 可选 Override |
| `option_card`    | Agent       | `OptionCard` 卡：单选 / 多选选项                                          |
| `confirm_card`   | Agent       | `ConfirmCard` 卡：三态按钮（应用 / 拒绝 / 改）                            |
| `diff_card`      | Agent       | `DiffCard` 卡：前后对比 + 接受 / 拒绝                                     |
| `error`          | System      | 错误条 + 重试按钮                                                         |
| `done`           | System      | 「Working 完成于 X」灰色条                                                |

**关键约束**：

- 所有非纯文本消息都通过 SSE event type 显式区分，前端按类型 dispatch 组件渲染。
- Human-loop 卡片**不阻塞** chat：用户可同时打字发新消息打断。
- 卡片状态持久化到 SQLite，关闭后再打开同状态。

#### 9.2.2 TodoWrite 卡片

**优先级**：P0

- Agent 在思考阶段调 TodoWrite 工具发起；前端渲染为带进度的 todo 列表卡。
- 每项有状态 `pending` / `in_progress` / `completed` / `cancelled`，颜色区分。
- 进度条：`completed / total`。

#### 9.2.3 ToolCard

- 显示工具名（如 `Read`、`Write`、`Bash`、`Skill: bullet-polish`）+ 参数缩略 + 状态。
- 用户可点开看完整参数 / 输出，默认折叠。
- Bash / Write 调用的输出可下载。

#### 9.2.4 ChatComposer（输入框）

| 元素                | 用途                                                          |
| ------------------- | ------------------------------------------------------------- |
| 多行 textarea       | 用户输入；⌘/Ctrl+Enter 发送                                  |
| `@` 文件引用        | 输入 `@` 触发文件选择器，引用 workspace 内某文件作为上下文     |
| 拖拽 / 粘贴文件      | 支持图片、PDF、DOCX、txt；粘贴文本自动识别长度                |
| Import 下拉         | 「+ Import」按钮：Claude Design ZIP / 简历文件 / 粘贴文本     |
| 模型切换            | 输入框左下显示当前 agent，点击切换                            |
| Stop 按钮           | 正在工作时显示 Stop，可中断 agent                             |

### 9.3 Artifact Preview + File Workspace（右栏）

**优先级**：P0

| ID    | 功能                       | 描述                                                                                          | 验收要点                                                 |
| ----- | -------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| AR-01 | Design Files Tab           | 类似 IDE 文件树：列出项目所有文件（resume.html / resume.json / styles.css / preview.png）    | 文件可点开 / 编辑 / 下载                                 |
| AR-02 | Artifact Tab               | 每个 emit 的 artifact 独占一个 tab；显示版本号（v1 / v2 / ...）                              | 可关闭、可复制、可设为「定稿」                          |
| AR-03 | Sandboxed iframe Preview   | `srcdoc` + `sandbox="allow-same-origin"` 渲染 HTML artifact；禁用脚本与远程资源              | 与导出完全一致                                          |
| AR-04 | Preview / Source / Edit 切换 | 顶部按钮：Preview（iframe）/ Source（高亮代码）/ Edit（可编辑）/ Draw（注释）/ Comment      | Edit 模式可手改 HTML/CSS，实时反馈到 chat 作为 user 消息 |
| AR-05 | 缩放                       | 100% / Fit / 实际尺寸三档；分页指示                                                          | 默认 Fit                                                |
| AR-06 | Drop Zone                  | Tab 切到 Design Files 时可拖入图片 / PDF / Figma 链接作为参考素材                            | 上传到项目 workspace                                    |
| AR-07 | Tweaks 面板                | 顶部开关切到「Tweaks」，agent 暴露的可调参数（颜色 / 字号 / 布局）以 slider/color 显示       | 调节即时生效，写回 chat 流                              |
| AR-08 | Finalize 按钮              | 「定稿」按钮，标记某个 artifact 为该项目的最终版                                              | 影响导出与缩略图                                        |

### 9.4 Agent Runtime

**优先级**：P0

| ID    | 功能                          | 描述                                                                                                  | 验收要点                                       |
| ----- | ----------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| AG-01 | CLI 自动检测                  | Daemon 启动时扫 PATH，识别 Claude Code / Codex / Cursor Agent / Gemini CLI（v1.0 这 4 个）            | 识别到的 CLI 在 EntryView 底部与 Settings 显示 |
| AG-02 | BYOK Proxy                    | Settings 中填入 baseUrl + apiKey + model；后端 normalize 各 provider SSE 为统一通道                  | 调用前显式隐私确认                             |
| AG-03 | Agent 切换                    | EntryView 底部 + ChatComposer 左下按钮可一键切换；切换后下条消息生效                                  | 切换不丢失对话历史                             |
| AG-04 | Agent 失败回退                | CLI agent 崩溃 / 超时 / 输出格式错误 → 自动重试 1 次 → 仍失败提示用户手动切换 agent                  | Toast + Settings 跳转                          |
| AG-05 | 并发约束                      | 单项目同时只允许 1 个 agent 调用；新调用自动 cancel 旧的                                              | UI 显示 Working 状态 + Stop                    |
| AG-06 | 隐私显式化                    | 首次使用 BYOK / CLI 时 PrivacyConsentModal，明确说明数据流向（Anthropic / OpenAI / 本地 CLI）        | 用户勾选才能继续                               |
| AG-07 | 用量统计                      | BYOK 模式每次调用记录 token 数；累计用量在 Settings 显示                                              | 仅本地，不上报                                 |

### 9.5 Skills 库

**优先级**：P0

| ID    | 功能           | 描述                                                                                            | 验收要点                                         |
| ----- | -------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| SK-01 | Library View   | EntryView 顶部 Tab「Skills」展示全部 skill：按 `rs:scenario` 分组（风格 / 能力 / 辅助）        | 缩略图 + 标题 + 描述 + 示例 prompt              |
| SK-02 | Skill 详情     | 点击 skill 进入详情：完整 SKILL.md 渲染 + `example.html` 在线预览                                | 预览同 artifact 沙盒                            |
| SK-03 | Agent 自动选择 | ChatComposer 默认不指定 skill；agent 自主选用                                                  | 选用记录显示在 ToolCard 里                      |
| SK-04 | 用户手动覆盖   | ChatComposer 输入框可用 `/skill:resume-modern-tech` 强制指定                                    | 优先级高于 agent 自选                           |
| SK-05 | 自定 skill 加载 | `appData/Resume Studio/skills/` 目录下用户加载的 skill，daemon 启动时合并                       | 与内置 skill 同等待遇                           |

### 9.6 Design Systems 库

**优先级**：P0

| ID    | 功能                       | 描述                                                                                       | 验收要点                                |
| ----- | -------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------- |
| DS-01 | Library View               | 顶部 Tab「Design systems」展示全部系统：4 色签名 + 字体栈缩略                              | 按行业筛选                              |
| DS-02 | Design System 详情         | DESIGN.md 渲染 + 调色板 swatch + 字体预览 + 一个 live showcase（小型简历样例）           | 切换语言看双语字体效果                  |
| DS-03 | 新建项目时绑定             | 新建面板的 Design System Select；可选「让 AI 选」                                          | 绑定后 agent 优先用该系统               |
| DS-04 | Chat 中切换                | 输入「换 stripe 风」→ agent 触发切换 → 重渲染 artifact                                     | 切换不重做 section 内容                 |
| DS-05 | 用户自定 design system     | `appData/Resume Studio/design-systems/` 目录下用户加载                                    | 同 SK-05                                |

### 9.7 持久化（SQLite + Project Workspace）

**优先级**：P0

| ID    | 功能                  | 描述                                                                                              | 验收要点                                       |
| ----- | --------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| PE-01 | SQLite 主库           | `appData/Resume Studio/app.sqlite`，5 表：`projects` / `conversations` / `messages` / `tabs` / `saved_templates` | 关闭后重开，todo 卡 / chat 进度 / 文件 tab 全恢复 |
| PE-02 | Project Workspace 目录 | 每项目独立 `projects/<id>/`，含 `resume.json` / `resume.html` / `styles.css` / 图片                | 用户可直接打开文件夹手改                       |
| PE-03 | Artifact 多版本       | 每个 emit 的 artifact 存为 `artifacts/v<n>/`，可回退                                              | 最多保留 20 版                                 |
| PE-04 | 备份                  | 每天 / 每 N 次 emit 自动 ZIP 备份到 `backups/`                                                    | 用户可手动导出 ZIP                             |
| PE-05 | 数据目录迁移          | Settings 中支持迁移 appData 路径                                                                  | 迁移过程中应用进入只读                          |

### 9.8 导出

**优先级**：P0

| ID    | 格式      | 描述                                                                                | 验收要点                                       |
| ----- | --------- | ----------------------------------------------------------------------------------- | ---------------------------------------------- |
| EX-01 | HTML      | 当前 artifact 的单文件 HTML（inline CSS），可邮件附件                              | 与 iframe 1:1                                  |
| EX-02 | PDF       | Daemon 用 headless Chromium 渲染 HTML → PDF                                       | 与 HTML 像素级 ≤ 5%                           |
| EX-03 | DOCX      | HTML → DOCX 转换（保段落 / 列表 / 链接）                                          | 不强求字体一致；提示用户                       |
| EX-04 | Markdown  | 从 artifact `resume.json` 渲染（不渲染 HTML）                                      | 适合 GitHub README                             |
| EX-05 | JSON      | 直接 dump `resume.json`                                                            | JSON Resume Schema 兼容                        |
| EX-06 | ZIP       | 全项目 ZIP：所有 artifact 版本 + 数据 + 元信息                                     | 可用作 Claude Design 风格的项目互换            |
| EX-07 | 系统对话框 | 所有导出走系统保存对话框，记忆上次目录                                              | 不弹自定义路径                                |

### 9.9 国际化（i18n）

**优先级**：P0

| ID     | 功能                | 描述                                                                                           | 验收要点                                |
| ------ | ------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------- |
| I18-01 | UI 语言             | 默认 zh-CN；Settings / EntryView 底部可切换 en-US                                              | 切换即生效                              |
| I18-02 | 简历 locale         | 每项目独立 `locale`，影响 agent 输出语言 / 日期格式 / 字体栈                                   | UI 与简历 locale 互不影响               |
| I18-03 | Agent prompt 多语 | Skill 提示词通过 `{lang}` 占位注入；agent 根据 locale 切换                                     | 不在前端做翻译                          |
| I18-04 | 双语简历            | 单项目可同时维护 zh + en 双数据集；Design system 支持双语字体栈                                | 切换语言看不同 artifact                 |

### 9.10 隐私与安全（产品视角）

**优先级**：P0

| ID    | 功能                 | 描述                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | 验收要点                                                |
| ----- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| PR-01 | 隐私首次提示         | 启用任何 agent（CLI / BYOK）前 PrivacyConsentModal，明确「简历内容会发送到 <provider>」                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | 用户勾选才生效                                         |
| PR-02 | API Key 存储         | BYOK key 仅入系统 keyring；不入 SQLite / 日志 / 错误消息                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | log 中 key 只显示后 4 位                               |
| PR-03 | 网络出口白名单       | Daemon 仅允许 4 个 BYOK provider 域名 + 用户填入的 baseUrl                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | 其它出口被拦                                           |
| PR-04 | Artifact 沙盒        | iframe `sandbox="allow-same-origin"`，禁用脚本 / 远程资源 / `<iframe>` 嵌套                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | 模板包恶意脚本无法执行                                 |
| PR-05 | CLI spawn 边界       | Daemon spawn CLI 时仅暴露项目 workspace 目录；不允许跨项目读写                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | 用户文件目录权限不被滥用                               |
| PR-06 | 不发送遥测           | Settings 中「不发送任何遥测」开关默认勾选；任何上报都是显式 opt-in                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | 写得明确                                               |

---

## 10. 设计原则

1. **Chat-only**：所有交互入口都收敛到 chat；不引入额外表单屏 / 设置屏覆盖主流程。
2. **Artifact-first**：模型不写散文，写可渲染的成品。
3. **Skill-composable**：每个能力是一个可单独审计、单独迭代的 skill 文件。
4. **Human-in-the-loop, not human-in-the-form**：人参与决策，但用 chat 内的卡片，不切到独立屏。
5. **本地优先**：BYOK + CLI 双轨；不强制云。
6. **可逆**：Artifact 多版本 / chat 不可删但可分支 / 删除走回收站。
7. **错误友好**：错误信息说清「发生了什么 + 下一步做啥」，不暴露 stack。
8. **键盘可达**：⌘K 快速切换、⌘Enter 发送、Esc 关闭浮窗、Tab 顺序合理。
9. **隐私显式化**：数据流向永远在用户视野内。

---

## 11. 非功能需求

### 性能

| 指标                          | 目标               |
| ----------------------------- | ------------------ |
| 冷启到 EntryView              | ≤ 2 秒             |
| 项目切换到 ProjectView        | ≤ 200ms            |
| Chat 消息首字（流式）         | ≤ 800ms            |
| Artifact 首次渲染             | ≤ 500ms（HTML <50KB） |
| TodoWrite 卡片更新延迟         | ≤ 100ms            |
| 导出 PDF（单页）               | ≤ 3 秒             |
| 内存峰值（含 10 个项目）       | ≤ 400 MB           |

### 可靠性

- SQLite WAL 模式，写入失败自动重试。
- Daemon crash 时 Web 显示重连状态；不丢失对话历史。
- Agent 调用失败时保留 chat 上下文，重试不丢消息。

### 安全

- BYOK Key keyring 存储。
- Artifact 沙盒严格。
- CLI spawn 仅暴露项目目录。
- 不远程上报。

### 可访问性

- 所有交互 `aria-label`，对比度 ≥ WCAG AA。
- 键盘可达。

### 兼容性

- 系统：macOS 12+、Windows 10+、Linux X11 / Wayland。
- 屏幕：最小 1280 × 720。

---

## 12. 竞品对标

| 能力                     | Claude Design | Open Design     | FlowCV / Resume.io | **Resume Studio**          |
| ------------------------ | ------------- | --------------- | ------------------ | -------------------------- |
| 形态                     | Chat + Artifact | Chat + Artifact | 表单 + 模板        | **Chat + Artifact**        |
| 数据本地                 | ✗             | ✓               | ✗                  | ✓                          |
| BYOK + CLI 双轨          | ✗             | ✓               | ✗                  | ✓                          |
| 开源                     | ✗             | ✓               | ✗                  | **(待定)**                 |
| Skills                   | 通用 30+      | 通用 31         | ✗                  | **简历专属 18-25**         |
| Design Systems           | 通用 50+      | 通用 129        | 模板 20+           | **行业相关 12-20**         |
| 简历 vertical 优化       | ✗             | ✗               | ✓                  | **✓（核心）**              |
| 多语言数据模型           | ✗             | ✗               | ✗                  | ✓                          |
| ATS                      | ✗             | ✗               | △                  | ✓                          |
| Cover Letter             | ✗             | ✗               | ✓                  | ✓                          |
| 桌面端原生               | ✗             | △（Electron）   | ✗                  | △（Electron 可选）        |

**护城河三条**：
1. 简历 vertical 专属 skill 集（FlowCV 没有 skill 架构，Claude/Open Design 没有简历专长）。
2. 中英双语数据同源（FlowCV 维护两份文件，我们维护一份带 i18n 模型）。
3. BYOK + CLI 双轨 + 本地数据，对隐私敏感用户最友好。

---

## 13. 里程碑（按 Slice）

| Slice | 范围                                                                                                                                            | 状态        |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 0     | Repo bootstrap：apps/daemon (Node) + apps/web (Next.js) + packages/contracts + tools-dev lifecycle                                              | 📋 计划     |
| 1     | EntryView（项目列表 + 新建面板）+ SQLite + 项目 CRUD                                                                                            | 📋 计划     |
| 2     | ProjectView shell（chat 左 + workspace 右）+ ChatComposer + Stream message 协议 + BYOK proxy（Anthropic）                                       | 📋 计划     |
| 3     | TodoWrite + ToolCard + Sandboxed artifact iframe + File Workspace 文件列表 + Source/Preview 切换                                                | 📋 计划     |
| 4     | Human-loop 卡片协议：QuestionForm / DirectionPicker / OptionCard / ConfirmCard / DiffCard                                                       | 📋 计划     |
| 5     | Skills 库：v1.0 18-25 个简历专属 skill + Library View + 详情 + agent 自动 / 手动覆盖                                                            | 📋 计划     |
| 6     | Design Systems 库：v1.0 12-20 套 + Library View + 详情 + chat 内切换                                                                            | 📋 计划     |
| 7     | CLI 适配器：Claude Code + Codex（v1.0 必备 2 个）+ AgentPicker + 隐私确认                                                                       | 📋 计划     |
| 8     | 导出 6 格式（HTML / PDF / DOCX / Markdown / JSON / ZIP）                                                                                        | 📋 计划     |
| 9     | 导入：Claude Design ZIP / JSON Resume / FlowCV JSON / PDF OCR + experience-extract skill                                                       | 📋 计划     |
| 10    | i18n（UI zh/en + 简历 locale）+ 双语简历 + Settings + keyring + 数据目录迁移                                                                    | 📋 计划     |
| 11    | CLI 适配器扩展：Cursor Agent / Gemini CLI（v1.0 GA 目标 4 个）                                                                                  | 📋 计划     |
| 12    | 端到端 / 视觉回归 + 模板沙盒强化 + 性能优化 + 打包发布（Electron 可选）                                                                         | 📋 计划     |
| GA    | v1.0 发布                                                                                                                                       | 📋 计划     |

> **注**：旧 Tauri / Rust workspace（`apps/resume-app/`、`crates/`）作为方向探索归档保留，不计入此 Roadmap。

---

## 14. 风险与假设

### 假设

- 用户接受 Web 应用形态；Electron 桌面壳可选。
- BYOK provider（Anthropic / OpenAI / Azure / Gemini）至少 2 个在目标地区可达。
- 至少 30% 用户已装 Claude Code 等 CLI（数据来自 Open Design 用户社群）。
- 用户能接受 chat-first 形态，而不是表单形态。

### 风险

| 风险                                          | 影响 | 缓解                                                                              |
| --------------------------------------------- | ---- | --------------------------------------------------------------------------------- |
| Agent 输出 artifact 视觉质量不稳定             | 高   | Critique skill 强制 5 维自评 + 用户随时 Tweaks 面板手改 + 多版本回退             |
| Skill 集没覆盖小众行业                         | 中   | 提供 `industry-custom` skill 兜底 + 用户加载本地 skill 接口                       |
| BYOK / CLI 双轨的故障域混乱                    | 高   | AppErr 中明确 `agent_source` 字段；UI 显示「当前是 Local CLI 失败 / BYOK 失败」  |
| iframe sandbox 在 Linux 某些 WebView 不稳     | 中   | E2E 矩阵覆盖 Chromium / WebKit / Linux X11 / Wayland                              |
| Chat 历史污染 context window                   | 中   | 自动摘要旧消息；超过阈值滚动                                                      |
| 多 artifact 版本占磁盘                         | 低   | 上限 20 版；GC 老版本                                                             |
| PDF 渲染中文字体缺失                           | 高   | 内置 NotoSansCJK 子集；font-face inline                                            |

---

## 15. 术语表

| 术语                | 释义                                                                       |
| ------------------- | -------------------------------------------------------------------------- |
| Agent               | 调用 LLM 的进程，可以是本地 CLI 或 BYOK proxy                              |
| Skill               | `skills/<name>/SKILL.md`，定义 agent 行为规则与文本资产                    |
| Design System       | `design-systems/<name>/DESIGN.md`，定义视觉 token 与字体栈                |
| Artifact            | Agent 输出的可渲染成品（HTML / JSON / 图像）                              |
| Direction           | Visual direction，一种 4 色 + 字体的预设组合（属于 design system 范畴）   |
| Human-loop Card     | Chat 内插入的特殊消息卡片，用户操作后回传一条新消息                       |
| TodoWrite           | Agent 的待办列表协议，前端渲染为可视化 todo 卡                            |
| ToolCard            | 工具调用消息卡，显示工具名 / 参数 / 状态                                  |
| ProjectView         | 主交互屏，左 chat 右 workspace 两栏                                       |
| FileWorkspace       | 右栏文件管理 + artifact iframe 预览                                       |
| BYOK                | Bring Your Own Key，用户自带 API Key                                       |
| Daemon              | 本地特权进程，负责 spawn agent / 读写文件 / 加载 skills 与 systems        |
| Project Workspace   | 单项目的本地文件夹，存数据与 artifact                                     |
| `rs:` frontmatter   | 简历专属的 SKILL.md 扩展字段                                              |

---

## 16. 附录：与现有代码的关系

- **旧三份 spec（2026-06-10）**：标记 SUPERSEDED；旧 `apps/resume-app/` (Tauri) 与 `crates/` (Rust workspace) 归档保留，不再开发。
- **新工程根目录**：`apps/daemon/`、`apps/web/`、`packages/contracts/`、`skills/`、`design-systems/`、`craft/`、`templates/` —— 详见后端 spec §2。
- **真理来源声明**：本 PRD 的视觉与交互对照以 `docs/prototype/resume-design.pen` + `open-design/` 实际形态为准；本 PRD 与 prototype/open-design 不一致时，以 prototype 为准并触发本 PRD 修订。
