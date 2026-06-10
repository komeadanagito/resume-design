# Resume Studio — 前端设计文档（中文）

| 字段     | 内容                                                                                |
| -------- | ----------------------------------------------------------------------------------- |
| 文档版本 | v1.0                                                                                |
| 创建日期 | 2026-06-10                                                                          |
| 状态     | Draft（待用户审阅）                                                                 |
| 设计来源 | `docs/prototype/resume-design.pen`                                                  |
| 关联文档 | PRD（同目录同日）、后端 spec（同目录同日）                                          |
| 已实现部分 | `apps/resume-app/`（Phase 2 slice 1，对应 PRD slice 0–1）                          |

---

## 0. 修订记录

| 版本 | 日期       | 修订人 | 说明                          |
| ---- | ---------- | ------ | ----------------------------- |
| v1.0 | 2026-06-10 | claude | 初稿，覆盖完整产品前端全部模块 |

---

## 1. 目标与非目标

### 目标

- 把 Resume Studio 完整产品的前端蓝图说清楚：架构 → 状态 → 屏幕 → 组件 → 主题 → 国际化 → 测试。
- 任何熟悉 React/TypeScript 的工程师能照本文实现新模块，**不需要重新发明架构**。
- 任何新增 section 类型 / 新增 customize 面板 / 新增 AI 工具，落地路径都是「加文件」。

### 非目标

- 不重述 PRD 的产品需求；产品「为什么做」请参 PRD。
- 不涵盖 Rust 后端 / Tauri 命令实现细节，只描述前端调用契约。
- 不写视觉规范完整稿；token 与组件具体像素值以 `.pen` 文件为准。

---

## 2. 设计基线

### 2.1 视觉 token（与 `.pen` 同源）

| Token              | 值                                          | 用途                           |
| ------------------ | ------------------------------------------- | ------------------------------ |
| `brand-500`        | `#0066FF`                                   | 主色：按钮、激活态、链接       |
| `brand-600`        | `#0052D6`                                   | 主色 hover                     |
| `brand-50`         | `#EBF3FF`                                   | 主色浅底：浮窗 hover、tag       |
| `ink-900`          | `#1D102C`                                   | 主文本                         |
| `ink-700`          | `#5C5564`                                   | 次要文本                       |
| `ink-500`          | `#8B8297`                                   | 占位 / 元信息                  |
| `ink-300`          | `#A29BAB`                                   | 极弱文本                       |
| `surface` (默认)   | `#F5F7FA`                                   | 页面底色                       |
| `surface-card`     | `#FFFFFF`                                   | 卡片底                         |
| `surface-muted`    | `#F8F6F3`                                   | 输入框 / 二级容器              |
| `surface-tag`      | `#F0ECE7`                                   | tag / chip 底                  |
| `card`（半径）     | `24px`                                      | 卡片圆角                       |
| `button`（半径）   | `16px`                                      | 按钮圆角                       |
| `pill`（半径）     | `999px`                                     | tag / 标签按钮                 |

> 在 `apps/resume-app/tailwind.config.ts` 中维护；新增视觉需求时先回头看 `.pen` 确认 token，**禁止从 `docs/page_design/*.md` 推断颜色**（旧文档曾使用过粉色调，与现版冲突）。

### 2.2 核心交互模式

1. **就地编辑**：所有 section 卡片三态机（折叠 / 展开 / 编辑）；不跳转新页面。
2. **居中浮窗**：添加内容、导出、确认删除均用 `Modal` 组件；不全屏接管。
3. **左编辑右预览**：Editor 主区域 grid `[minmax(360px,560px) 1fr]`；右栏在 Content/Customize/AI 三个 tab 下保持不变。
4. **TopNav 4 段**：Overview / Content / Customize / AI Tools；当前 tab 高亮为 brand-50 底 + brand-500 文字。
5. **可逆**：所有破坏性动作进入全局 Undo 栈。

---

## 3. 应用结构

### 3.1 顶层路由

v1.0 不引入 React Router；通过 `useState` + Context 切换主区域。原因：

- 当前只有「Overview」「Editor」「Settings」三个真正独立的视图。
- Editor 内部的 tab 切换属于局部状态，不需要 URL 表达。
- 待真正出现「分享链接」「深链」需求时再引入 Router，零成本。

视图切换通过单一根级状态：

```ts
type AppView =
  | { kind: "overview" }
  | { kind: "editor"; resumeId: string }
  | { kind: "settings" };
```

### 3.2 Editor 内部 tab

```ts
type EditorTab = "content" | "customize" | "aiTools";
// "overview" 在 TopNav 中保留，点击切回 AppView.overview
```

---

## 4. 状态管理

### 4.1 总体结构

单一 `ResumeProvider`（`useReducer` + `createContext`）承担：

- 当前打开的 `Resume` 数据
- `ResumeSettings`（绑定该简历）
- 加载/保存状态机
- 全局 Undo / Redo 栈

> 不引入 Redux / Zustand：当前规模 `useReducer` 足够；扩展点是 action 类型，加变体即可。

### 4.2 Action 清单（v1.0 完整版）

```ts
type ResumeAction =
  // 持久化
  | { kind: "load"; resume: Resume; settings: ResumeSettings }
  | { kind: "loadError"; error: string }
  // Personal
  | { kind: "setPersonal"; personal: PersonalInfo }
  // Section CRUD
  | { kind: "addSection"; section: Section }
  | { kind: "removeSection"; index: number }
  | { kind: "updateSection"; index: number; section: Section }
  | { kind: "reorderSections"; from: number; to: number }
  // Customize
  | { kind: "setSettings"; patch: Partial<ResumeSettings> }
  | { kind: "setTemplate"; templateId: string }
  // Undo/Redo
  | { kind: "undo" }
  | { kind: "redo" }
  // 元信息
  | { kind: "setMeta"; patch: Partial<ResumeMeta> };
```

### 4.3 Undo / Redo 实现

- 维护 `past: ResumeSnapshot[]` 与 `future: ResumeSnapshot[]`。
- `ResumeSnapshot = { resume, settings }`，通过 `structuredClone` 序列化。
- 每个修改型 action 在 reducer 中先 push 旧快照，清空 future。
- `undo` 将 present 推入 future，pop past 顶部为 present。
- 栈深度上限 50；超出从最旧端 drop。
- Customize 子面板的连续 slider 拖动应做防抖 / 节流，避免 Undo 栈污染（拖动结束才提交快照）。

### 4.4 持久化时机

- 编辑型 action 完成后调用 `saveResume`（防抖 1s）。
- Customize action 完成后调用 `saveSettings`（防抖 1s）。
- 用户可在 Settings 中调防抖周期或关闭自动保存。
- 关闭窗口前 flush 未完成保存。

---

## 5. 类型与数据流

### 5.1 单一数据源：`ts-rs` 生成的 TS 类型

```
crates/resume-core ── ts-rs export ──→ apps/resume-app/src/lib/types/
```

- Rust 中 `#[cfg_attr(feature = "ts", derive(TS))]` 标注所有模型类型。
- 生成的 `.ts` 文件**提交进 git**，前端冷启不需要先跑 cargo。
- 流程：改 Rust 结构 → `cargo test -p resume-core --features ts` → 生成 TS → 一并提交。
- 前端**永远不手写** `Resume / Section / *Item` 类型；编辑这些类型属于 Rust 改动。

### 5.2 当前已生成清单

```
src/lib/types/
├── Resume.ts
├── ResumeMeta.ts
├── ResumeSettings.ts
├── PersonalInfo.ts
├── ExtraField.ts
├── Section.ts
├── SectionKind.ts
├── SummarySection.ts
├── ExperienceSection.ts / ExperienceItem.ts
├── EducationSection.ts / EducationItem.ts
└── SkillsSection.ts / SkillGroup.ts
```

### 5.3 完整产品需新增（v1.0）

```
ProjectsSection.ts / ProjectItem.ts
LanguagesSection.ts / LanguageItem.ts
CertificationsSection.ts / CertificationItem.ts
InterestsSection.ts
AwardsSection.ts / AwardItem.ts
PublicationsSection.ts / PublicationItem.ts
ReferencesSection.ts / ReferenceItem.ts
VolunteeringSection.ts / VolunteeringItem.ts
CoursesSection.ts / CourseItem.ts
CustomSection.ts / CustomItem.ts
HeaderSection.ts
CoverLetter.ts / CoverLetterBlock.ts
AtsReport.ts / AtsDimension.ts
TemplateMeta.ts
AiCandidate.ts
```

---

## 6. Tauri 调用层

### 6.1 文件组织

```
src/lib/tauri/
├── index.ts          只 re-export，业务代码统一从此导入
├── resume-io.ts      load/save/list/new/duplicate/delete/import_resume
├── export.ts         export_pdf/html/docx/markdown/json
├── photo.ts          upload/delete/get_photo_path
├── template.ts       list/load/install_template
├── ai.ts             ai_polish_bullet / ai_rewrite_summary / ai_draft_cover_letter
├── ats.ts            ats_score
├── settings.ts       load/save app_settings
└── system.ts         default_resume_path / open_data_dir / show_in_finder
```

### 6.2 wrapper 模式

```ts
// 每个 wrapper 一行式：
export const loadResume = (path?: string) =>
  invoke<Resume>("load_resume", { path });
```

- 不在 wrapper 里做错误转换；错误透传给调用方，由 UI 决定如何展示。
- 不在 wrapper 里做 Toast；UI 层捕获后调用 `useToast()`。
- 异步流式命令（如 AI）使用 Tauri channel：

```ts
export async function aiPolishBullet(
  input: AiPolishInput,
  onChunk: (chunk: AiCandidate) => void
): Promise<void> {
  const channel = new Channel<AiCandidate>();
  channel.onmessage = onChunk;
  await invoke("ai_polish_bullet", { input, channel });
}
```

### 6.3 错误类型

所有 wrapper 抛出统一 `AppError`（与后端 `AppError` 形态一致，由 Tauri 序列化）：

```ts
type AppError = {
  code: "io" | "json" | "schema" | "path" | "ai" | "ats" | "render" | "template";
  message: string;
};
```

UI 层根据 `code` 决定文案与重试策略。

---

## 7. 屏幕清单

### 7.1 Overview

```
┌─────────────────────────────────────────────────────────┐
│ TopNav: [Resume Studio]                  [Settings] [⋯] │
├─────────────────────────────────────────────────────────┤
│  我的简历                          [新建] [导入]         │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │ Resume 1 │  │ Resume 2 │  │ Resume 3 │               │
│  │  (缩略)  │  │  (缩略)  │  │  (缩略)  │               │
│  │  zh-CN   │  │  en-US   │  │  zh-CN   │               │
│  │ 5 sec    │  │ 4 sec    │  │ 6 sec    │               │
│  └──────────┘  └──────────┘  └──────────┘               │
│                                                         │
│  我的求职信（折叠卡）                                    │
└─────────────────────────────────────────────────────────┘
```

组件：
- `OverviewPage`：根组件
- `ResumeCard`：卡片 + 右上 `⋯` 菜单（重命名 / 复制 / 删除）
- `EmptyState`：无简历时的引导
- `ImportResumeDialog`：导入流程（选文件 → 进度条 → 结果）

### 7.2 Editor / Content（已实现）

```
┌─────────────────────────────────────────────────────────┐
│ TopNav: [Overview][Content*][Customize][AI Tools]       │
│         ... [Resume 1 ▾] [Download] [⋯]                 │
├──────────────────────────┬──────────────────────────────┤
│ ┌──────────────────────┐ │                              │
│ │ Personal             │ │                              │
│ │ Quan ▾  [Edit]       │ │       (Preview 区域)         │
│ └──────────────────────┘ │                              │
│ ┌──────────────────────┐ │                              │
│ │ Summary              │ │                              │
│ │ ...                  │ │                              │
│ └──────────────────────┘ │                              │
│ ┌──────────────────────┐ │                              │
│ │ Experience           │ │                              │
│ │ - Co A · Role        │ │                              │
│ │ - Co B · Role        │ │                              │
│ │ [+ 新条目]    [🗑 删除]│ │                              │
│ └──────────────────────┘ │                              │
│                          │                              │
│     [+ 添加内容]         │                              │
└──────────────────────────┴──────────────────────────────┘
```

组件：
- `EditorPage`（已实现，需扩展为支持 customize / aiTools 切换）
- `PersonalSection`（已实现）
- `SectionCardShell`（已实现）
- 15 个 `*Card`（仅 SummaryCard 已实现）
- `AddContentModal`（已实现）

### 7.3 Editor / Customize

```
┌──────────────────────────┬──────────────────────────────┐
│ Document       [active]  │                              │
│ Templates                │                              │
│ Layout                   │   (子面板内容动态切换)        │
│ Font Size                │                              │
│ Spacing                  │                              │
│ Entries                  │                              │
│ Headings                 │                              │
│ Font                     │                              │
│ Colors                   │                              │
│ Header                   │                              │
│ Photo                    │                              │
│ Links                    │                              │
│ Footer                   │                              │
│ Sections                 │                              │
└──────────────────────────┴──────────────────────────────┘
   (left: CustomizeSubNav 已实现)  (right: 子面板)
```

组件：
- `CustomizePanel`（已实现：仅 DocumentPanel 完整，其余 13 个为 `PlaceholderPanel`）
- 14 个子面板组件（见 §12）

### 7.4 Editor / AI Tools

```
┌──────────────────────────┬──────────────────────────────┐
│  AI Tools                │                              │
│                          │                              │
│  ┌────────────────────┐  │                              │
│  │ Bullet 润色        │  │                              │
│  │ - 选条目 → 润色    │  │                              │
│  └────────────────────┘  │                              │
│  ┌────────────────────┐  │                              │
│  │ Summary 改写       │  │                              │
│  └────────────────────┘  │                              │
│  ┌────────────────────┐  │                              │
│  │ Cover Letter 生成  │  │                              │
│  └────────────────────┘  │                              │
│  ┌────────────────────┐  │                              │
│  │ ATS 评分           │  │                              │
│  └────────────────────┘  │                              │
└──────────────────────────┴──────────────────────────────┘
```

组件：
- `AiToolsPanel`：分卡片入口
- `BulletPolishDialog` / `SummaryRewriteDialog` / `CoverLetterGenDialog` / `AtsScorePanel`
- `AiKeyMissingState`：未配置 Key 时占位

### 7.5 Settings

```
┌─────────────────────────────────────────────────────────┐
│  设置                                                    │
│                                                         │
│  界面                                                    │
│    UI 语言        [简体中文 ▾]                            │
│    默认导出格式    [PDF ▾]                                │
│                                                         │
│  AI                                                     │
│    Anthropic Key  [●●●●●●●●  测试]                       │
│    隐私提示        本应用调用 AI 会发送简历内容...        │
│                                                         │
│  数据                                                    │
│    数据目录       /Users/quan/Library/.../Resume Studio  │
│                   [打开目录] [迁移目录]                   │
│    自动保存        [开] 间隔 [1s ▾]                       │
│                                                         │
│  关于                                                    │
│    版本           1.0.0                                  │
│    开源地址        github.com/your-org/resume-studio     │
└─────────────────────────────────────────────────────────┘
```

组件：`SettingsPage`、`SettingsSectionCard`、`AiKeyForm`、`DataDirRow`。

---

## 8. 通用组件库

放在 `src/components/form/` 与 `src/components/`，原则：薄、组合、token 化。

| 组件                | 文件                          | 用途                                    |
| ------------------- | ----------------------------- | --------------------------------------- |
| `Button`            | form/Button.tsx               | 主/次/虚线/图标按钮；尺寸 sm/md/lg      |
| `Field`             | form/Field.tsx                | label + helper + error 容器             |
| `Input`             | form/Input.tsx                | 单行文本                                |
| `Textarea`          | form/Textarea.tsx             | 多行                                    |
| `Select`            | form/Select.tsx               | 原生 select 包装（已有）                |
| `Checkbox`          | form/Checkbox.tsx             |                                         |
| `Toggle`            | form/Toggle.tsx               | 开关                                    |
| `Slider`            | form/Slider.tsx               | Customize 用                            |
| `ColorPicker`       | form/ColorPicker.tsx          | Customize/Colors 用                     |
| `FontPicker`        | form/FontPicker.tsx           | Customize/Font 用                       |
| `Modal`             | Modal.tsx（已有）             | 居中浮窗                                |
| `Tag`               | Tag.tsx                       | section chip / 标签                     |
| `Tooltip`           | Tooltip.tsx                   |                                         |
| `Toast` / `useToast`| useToast.tsx                  | 全局提示                                |
| `EmptyState`        | EmptyState.tsx                | 无内容时的引导                          |
| `SkeletonRow`       | SkeletonRow.tsx               | 加载占位                                |
| `ConfirmDialog`     | ConfirmDialog.tsx             | 二次确认（删除等）                      |
| `IconButton`        | form/IconButton.tsx           | 圆形图标按钮                            |

**约定**：所有按钮的圆角、阴影、过渡都走 Tailwind token；不在组件里 hardcode 颜色字面量。

---

## 9. Section 家族

### 9.1 三件套架构

```
SectionCardShell (UI 框架)
        ▲
        │ props: title/icon/entries/renderEditor/onDelete/onDeleteEntry
        │
SECTION_REGISTRY (metadata)
   每 kind: { titleKey, descriptionKey, icon, blank() }
        ▲
        │
render.tsx (封闭 switch 分发)
   case "summary": return <SummaryCard ... />;
   case "experience": return <ExperienceCard ... />;
   ...
```

### 9.2 SectionCardShell 契约

```ts
type SectionCardShellProps = {
  titleKey: StringKey;
  icon: ReactNode;
  entries?: EntryRow[];
  renderEditor: (entry: unknown | undefined, onDone: () => void) => ReactNode;
  onDelete?: () => void;                     // 整 section 删
  onDeleteEntry?: (id: string) => void;      // 单条目删
  singleEntry?: boolean;                     // Summary 用
  initialMode?: SectionCardMode;
};
```

**状态机**：

```
collapsed ──header click──→ expanded
expanded  ──header click──→ collapsed
expanded  ──"+ 新条目"  ──→ editing(undefined)
expanded  ──click 条目  ──→ editing(entry)
editing   ──onDone()    ──→ expanded
```

### 9.3 添加新 kind 的步骤

1. **Rust**：`crates/resume-core/src/model/section.rs` 加 enum 变体 + payload 结构体。
2. **类型生成**：`cargo test -p resume-core --features ts`。
3. **前端注册**：在 `src/lib/section-registry.ts` 加 `RecordEntry`。
4. **前端组件**：新建 `src/components/sections/<Kind>Card.tsx`，使用 `SectionCardShell`。
5. **前端分发**：在 `render.tsx` 的 switch 加 case；不加会编译错误。
6. **i18n**：在 `zh.ts` 与 `en.ts` 加对应 `sections.<kind>` 与 `addContent.descriptions.<kind>` 文案。

### 9.4 15 类 section 表单字段表

| Kind            | 表单字段                                                                                          | 编辑组件特点                              |
| --------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Summary         | content（Textarea，5 行）                                                                          | AI 改写按钮在 Textarea 右上              |
| Experience      | company, role, location, start, end, current(toggle), bullets[]                                   | bullets 列表可增删；每条有 AI 润色      |
| Education       | school, degree, field, location, start, end, honors[]                                             | honors 为 chip 输入                       |
| Skills          | groups[{name, items[chip]}]                                                                       | 拖拽重排 group                            |
| Projects        | name, link, role, start, end, description(Textarea), tech[chip]                                   |                                           |
| Languages       | items[{name, level(Select)}]                                                                      | level 选项可切换 CEFR / 中文描述         |
| Certifications  | items[{name, issuer, date, credentialId, link}]                                                   |                                           |
| Interests       | items[chip]                                                                                       | 单行 chip                                 |
| Awards          | items[{name, issuer, date, description}]                                                          |                                           |
| Publications    | items[{title, authors, venue, date, link}]                                                        | venue / 期刊样式                          |
| References      | items[{name, relation, contact}]                                                                  | 提示「可选，部分行业不需要」              |
| Volunteering    | items[{org, role, start, end, bullets[]}]                                                         | 与 Experience 类似但简化                 |
| Courses         | items[{name, provider, date, link}]                                                               |                                           |
| CustomSection   | title(用户自定义), items[{label, value}]                                                          | 兜底，字段动态                            |
| Header          | 共用 Personal 数据；面板提供 toggle：显隐头像、字段顺序                                          | 不是真正的 data section，写入 settings    |

### 9.5 日期字段统一处理

- 所有 `start / end / date` 字段在 Rust 侧均为 `Option<String>`，保留 "Present" / "2024" / "2024-03" 等用户原文。
- 前端 `DateInput` 组件支持三种粒度：年 / 年月 / 年月日，由 settings 中 `dateFormat` 决定显示。
- 不做日期校验（用户写什么是什么），但提供格式提示。

---

## 10. Add Content 浮窗

### 10.1 已实现

- 居中 `Modal`，宽度 `max-w-[960px]`。
- 头部右侧有「导入简历」按钮（FlowCV 风格的 quick start）。
- 网格 `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`。
- 已添加的 kind 显示「已添加」徽标 + 半透明，且 `disabled`。

### 10.2 完整产品扩展

- 网格按分组：「**推荐**」（Summary/Experience/Education/Skills/Projects）/「**可选**」（Languages/Certifications/Awards/Publications/Volunteering/Courses/Interests/References）/「**自定义**」（CustomSection）。
- 每组用 `h3` 小标题 + 网格。
- 搜索框（顶部）：实时过滤 tile。
- 顶部「导入简历」按钮点击 → 关闭浮窗 → 打开 `ImportResumeDialog`。

---

## 11. Preview 实时渲染

### 11.1 渲染管线

```
Resume + Settings + Template
       │
       ▼ (debounce 250ms)
  invoke("render_html_preview")  →  HTML string
       │
       ▼
  <iframe srcDoc={html} sandbox="allow-same-origin" />
```

### 11.2 决策：iframe vs React 内联

| 维度       | iframe                       | React 内联                                |
| ---------- | ---------------------------- | ----------------------------------------- |
| 字体隔离   | 完全隔离                     | 受外层 CSS 干扰                           |
| CSS 隔离   | 完全隔离                     | 需 CSS-in-JS / scoping                    |
| 滚动 / 分页 | 自然                         | 需手工模拟                                |
| 与导出一致 | 与 PDF 路径同一份 HTML        | 不一致风险                                |
| 性能       | 整页 reflow                  | 局部 diff                                 |

**选 iframe**。原因：与 PDF 导出共用一份 HTML 渲染器，**所见即所得就是真的所见即所得**。性能可接受（防抖 + Tauri 命令在 Rust 端）。

### 11.3 分页与缩放

- iframe 内 CSS 用 `@page` 规则定义页面尺寸。
- iframe 外包一层 wrapper，通过 `transform: scale(...)` 适应右栏宽度。
- 多页：CSS Page Break；右栏可滚动；底部显示「1 / 2 页」指示。

---

## 12. Customize 子系统

### 12.1 已实现：DocumentPanel

包含三组卡片：

1. **Document Settings**：Language / DateFormat / PageFormat（已实现）
2. **Design Templates**：缩略图 grid + 「浏览模板」按钮（实现了 UI 占位）
3. **Layout**：标题 + Undo/Redo 按钮（实现了 UI 占位）

### 12.2 14 子面板的预期形态

| Sub-Panel  | 控件清单                                                            | 数据字段（在 ResumeSettings 中）                         |
| ---------- | ------------------------------------------------------------------- | -------------------------------------------------------- |
| Document   | Language / DateFormat / PageFormat                                  | `language` / `dateFormat` / `pageFormat`                 |
| Templates  | 完整模板缩略图网格 + 分类筛选 + 详情浮窗                            | `templateId`                                             |
| Layout     | 单/双列、侧栏宽度（slider）、左右翻转                              | `layout.columns` / `layout.sidebarWidth` / `layout.flip` |
| Font Size  | 全局 slider（80–120%）、标题/正文/元信息单独 slider                | `fontSize.*`                                             |
| Spacing    | 行距、段距、卡片间距、页边距 slider                                | `spacing.*`                                              |
| Entries    | 对齐方式、日期对齐、项目符号样式                                    | `entries.*`                                              |
| Headings   | 大写 / 标题样式、下划线、颜色块                                    | `headings.*`                                             |
| Font       | 英文字体 + 中文字体（两个 FontPicker）                              | `font.en` / `font.zh`                                    |
| Colors     | 主色 / 文本色 / 背景色（ColorPicker）+ 预设主题                    | `colors.*`                                               |
| Header     | 头像显隐、字段顺序（拖拽）、字号                                    | `header.*`                                               |
| Photo      | 形状（圆/方/圆角方）、边框、阴影                                    | `photo.*`                                                |
| Links      | 链接样式（下划线 / 图标 / 文本色）、显示 URL 全文                  | `links.*`                                                |
| Footer     | 显隐、页脚内容                                                      | `footer.*`                                               |
| Sections   | section 拖拽排序 + 显隐                                            | `sectionOrder[]` / `sectionVisibility{}`                 |

### 12.3 子面板组件化模板

每个子面板独立文件 `components/customize/<Name>Panel.tsx`。约定：

```tsx
export function ColorsPanel() {
  const t = useT();
  const { settings, setSettings } = useResume();
  return (
    <PanelShell title={t("customize.colors")}>
      <PanelCard title={t("customize.colors.primary")}>
        <ColorPicker
          value={settings.colors.primary}
          onChange={(c) => setSettings({ colors: { ...settings.colors, primary: c } })}
        />
      </PanelCard>
      {/* ... */}
    </PanelShell>
  );
}
```

`PanelShell` / `PanelCard` 是 customize 内部抽出的小布局原子，保持 14 个子面板视觉一致。

### 12.4 新增子面板的步骤

1. `lib/types/ResumeSettings.ts` 加字段（先改 Rust，跑 ts-rs 同步）。
2. 写 `components/customize/<Name>Panel.tsx`。
3. 在 `CustomizePanel.tsx` 的 switch 加 case。
4. 在 `CustomizeSubNav.tsx` 的 `SUB_NAV_ITEMS` 加项（已有 14 项即可）。
5. 在 zh.ts / en.ts 加文案。

---

## 13. AI 工具子系统

### 13.1 入口分布

- **AI Tools tab**：集中入口，分卡片展示能力。
- **Inline**：Summary 编辑态、Experience bullet 编辑态、Volunteering bullet 编辑态有「✨ AI 润色」按钮。

### 13.2 流式输出 UX

- 触发后立即弹小浮窗，显示「思考中…」骨架。
- 流式 chunk 逐字追加到候选区。
- 候选可点击「应用」或「拒绝」，应用走 `updateSection` action 进入 Undo 栈。

### 13.3 隐私显式化

- 首次启用 AI 弹一次性确认对话框：「AI 调用会将简历内容发送到 Anthropic 服务器，是否继续？」
- 用户拒绝则 AI 入口隐藏，Settings 中可重新开启。
- 不发送：照片、AI Key、Customize 设置（除非任务需要）。

### 13.4 用量

- 每次调用前估算 token 数，调用后记录真实 token 数。
- 累计今日用量在 AI Tools 头部 chip 显示。
- 数据持久化到 `settings.aiUsage`，不上报。

---

## 14. ATS 评分子系统

### 14.1 流程

```
用户在 AI Tools / ATS 面板粘贴 JD
   ↓
点击「评分」按钮
   ↓
invoke("ats_score", { resume, jd })  ←  纯 Rust 同步，无 LLM
   ↓
返回 AtsReport { total, dimensions[], suggestions[] }
   ↓
渲染：雷达图（4 维）+ 总分大字 + 改进建议列表
```

### 14.2 改进建议联动

- 每条建议挂 `sectionRef: { kind, index, field }`，点击跳转到对应编辑态。
- 改完保存后可一键「重新评分」。

### 14.3 历史

- 最多保留 10 条评分快照，存于 `appData/<resumeId>/ats-history.json`。
- 列表显示日期 + 总分 + JD 摘要前 80 字符。

---

## 15. 导出流程

### 15.1 入口

- TopNav 右侧「Download」按钮 → 弹出 `ExportFormatPicker` 浮窗。
- 浮窗显示 5 种格式 + 系统默认（由 Settings 决定）。

### 15.2 流程

```
选择格式 → invoke("export_<format>", { resume, settings })
        ↓ Rust 返回 Vec<u8>
系统保存对话框（Tauri dialog API） → 写入用户选择路径
        ↓
Toast 成功提示 → 「在 Finder 中显示」按钮
```

### 15.3 失败处理

- 错误 toast 显示 message；不重启编辑器。
- PDF 导出失败时降级建议「先导出 HTML 自行打印」。

---

## 16. i18n

### 16.1 文件结构

```
src/lib/i18n/
├── index.tsx     LocaleProvider, useT, StringKey 类型推导
├── zh.ts         中文字典（无 `as const`，保持类型可扩展）
└── en.ts         英文字典（与 zh 同 shape）
```

### 16.2 类型安全的 key

```ts
// 通过 DotKeys<T> 递归类型从 zh dict 派生
type StringKey = DotKeys<typeof zh>;
// 例: "sections.summary" | "addContent.title" | "customize.subNav.colors" | ...
```

任何字符串插值/拼接都禁止，必须经过 `t(key)`。

### 16.3 简历内容语言 vs UI 语言

- **UI 语言**：`LocaleProvider` 状态，影响所有 `t()` 调用。
- **简历内容语言**：`resume.meta.locale`，影响：模板内默认 section 标题文案、日期格式、AI 写作语言、字体回退顺序。
- 两者完全独立。UI 是中文的用户可以编辑英文简历。

### 16.4 新增语言

1. 复制 `zh.ts` 为新 locale 文件，逐 key 翻译。
2. 在 `LocaleProvider` 中注册。
3. Settings 与 TopNav 的 locale 下拉自动出现新项（从 registry 派生）。

---

## 17. 主题 token 与样式

### 17.1 来源

`apps/resume-app/tailwind.config.ts` 直接映射 `.pen` 中的 design token。每次视觉调整：

1. 改 `.pen` 中的 color / radius 变量。
2. 同步到 `tailwind.config.ts`。
3. 不在组件里 hardcode 颜色字面量；新颜色 → 先看 token 是否够，不够补 token。

### 17.2 阴影系统

```ts
boxShadow: {
  card: "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)",
  cardHover: "0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)",
  modal: "0 24px 48px rgba(0,0,0,0.12)",
}
```

### 17.3 暗色模式

v1.0 暂不实现。预留 token 命名空间 `dark:` 前缀，未来直接补全。

---

## 18. 错误与状态机

### 18.1 加载/保存状态

```ts
type ResumeStatus = "idle" | "loading" | "saving" | "saved" | "error";
```

- `loading`：首次或切换简历时，显示 `<CenteredMessage>{t("editor.loading")}</CenteredMessage>`。
- `saving`：TopNav 右侧显示小转圈，不阻塞编辑。
- `saved`：1 秒后淡出。
- `error`：显示错误条 + 重试按钮；编辑可继续，但保存被禁用直到重试成功。

### 18.2 错误展示策略

| 错误类型              | 展示位置                | 是否 Toast |
| --------------------- | ----------------------- | ---------- |
| 加载失败              | 全屏中心消息            | 否         |
| 保存失败              | TopNav 右侧条 + 顶部 Toast | 是         |
| AI 调用失败          | AI 浮窗内               | 否         |
| ATS 调用失败          | ATS 面板内              | 否         |
| 导出失败              | Toast + 详情对话框      | 是         |
| 模板加载失败          | Customize / Templates 内 | 否         |

---

## 19. 测试策略

### 19.1 单元测试（Vitest）

- 每个 reducer action 独立 case，断言新 state。
- 每个 section 表单组件：渲染 + 字段填写 + onSave 回调验证。
- `useT` / `LocaleProvider` 切换场景。

### 19.2 组件集成（Vitest + Testing Library）

- `SectionCardShell` 三态切换。
- `AddContentModal` 已添加 → 置灰 → 删除后恢复。
- Undo / Redo 栈连续操作。

### 19.3 端到端（Playwright，Tauri 模式）

- 流程 1：新建简历 → 加 3 个 section → 导出 PDF。
- 流程 2：双语切换 → 简历内容随 locale 重渲染。
- 流程 3：AI 润色 bullet → 接受 → Undo。
- 流程 4：ATS 评分 → 改 section → 重新评分。

### 19.4 视觉回归

- Preview iframe 输出与基线快照对比（Playwright 视觉 diff）。
- 模板切换不破坏现有内容渲染。

---

## 20. Roadmap（slice 切分）

| Slice | 内容                                                                          | 状态     |
| ----- | ----------------------------------------------------------------------------- | -------- |
| 1     | Editor shell + Content tab + PersonalSection + Summary card + Add Content 浮窗  | ✅ 已完成 |
| 2     | 剩余 11 类 section 组件 + 拖拽排序 + 条目级 CRUD                                | ⏳ 进行中 |
| 3     | Preview iframe + Customize 全 14 子面板 + 模板缩略图                            | 📋 计划   |
| 4     | 导出浮窗 + PDF/HTML/DOCX/MD/JSON 导出 wrapper                                   | 📋 计划   |
| 5     | AI Tools panel + bullet 润色 inline + summary 改写 inline                       | 📋 计划   |
| 6     | ATS 评分面板 + 改进建议联动                                                    | 📋 计划   |
| 7     | Cover Letter 编辑器                                                            | 📋 计划   |
| 8     | Overview 页 + 多简历管理 + 导入对话框                                          | 📋 计划   |
| 9     | Settings 页 + AI Key 配置 + 数据目录管理 + 自动保存策略 + i18n UI 切换打磨     | 📋 计划   |
| 10    | 视觉回归 + 端到端测试 + 打包发布                                                | 📋 计划   |

---

## 21. 不做的事（明确边界）

- 不引入 React Router（理由见 §3.1）。
- 不引入 Redux / Zustand / Jotai（理由见 §4）。
- 不引入 CSS-in-JS（统一 Tailwind）。
- 不在前端做 AI prompt 工程；prompt 在 Rust 端集中管理（见后端 spec §9）。
- 不在前端做 ATS 评分规则；前端只展示评分结果。
- 不写浏览器版（v1.0 仅 Tauri）。
- 不实现暗色模式（v1.0）。

---

## 22. 与现有代码的对应关系

| 章节 | 已实现 | 对应文件 |
| ---- | ------ | -------- |
| §2 视觉 token | ✅ | `apps/resume-app/tailwind.config.ts` |
| §3 应用结构 | ⏳ 部分（只有 Editor） | `App.tsx`、`pages/EditorPage.tsx` |
| §4 状态管理 | ⏳ 部分（无 Undo / 无 settings reducer） | `lib/resume-context.tsx` |
| §5 类型生成 | ✅ | `lib/types/` |
| §6 Tauri 调用 | ⏳ 部分（3 个命令） | `lib/tauri.ts` |
| §7.2 Editor / Content | ✅ | `pages/EditorPage.tsx` 等 |
| §7.3 Editor / Customize | ⏳ 部分（仅 Document） | `components/customize/` |
| §8 通用组件 | ⏳ 部分 | `components/form/` |
| §9 Section 家族 | ⏳ 仅 Summary | `components/sections/` |
| §10 Add Content | ✅ | `components/AddContentModal.tsx` |
| §11 Preview | ❌ | 占位 |
| §12 Customize 14 子面板 | ❌ 13 占位 | `components/customize/PlaceholderPanel.tsx` |
| §13 AI 工具 | ❌ | — |
| §14 ATS | ❌ | — |
| §15 导出 | ❌ | — |
| §16 i18n | ✅ | `lib/i18n/` |
| §17 主题 | ✅ | `tailwind.config.ts` |

**真理来源声明**：本 spec 的视觉与组件命名以 `docs/prototype/resume-design.pen` 为准；本 spec 与 .pen 不一致时，以 .pen 为准并触发本 spec 修订。
