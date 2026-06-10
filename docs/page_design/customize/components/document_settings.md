# Document Settings 文档设置

## 组件概览

- 组件名称：DocumentSettingsCard
- 所属面板：Document 文档
- 容器样式：白色圆角卡片，轻微阴影
- 内边距：24px（p-6）

## 标题区

- 文案：Document Settings 文档设置
- 样式：深紫色，18px，extrabold
- 下方间距：20px（mb-5）

## 表单字段

所有字段垂直排列，字段间距 16px（gap-4）。

### Language 语言

- 标签：Language
  - 样式：深紫色，14px，bold
- 控件：下拉选择器（Select）
- 当前值：English (US)
- 下拉选项：
  - English (US)
  - English (UK)
  - 中文 (简体)
  - 中文 (繁體)
  - 日本語
  - 한국어
  - Français
  - Deutsch
  - Español
- 控件样式：
  - 背景：`#F8F6F3`（surface-muted）
  - 圆角：12px（rounded-xl）
  - 内边距：12px 16px（py-3 px-4）
  - 文字色：`#1D102C`（ink-900）
  - 右侧图标：下拉箭头（ChevronDown），颜色 `#8B8297`（ink-500）
  - 边框：透明，聚焦时 `#0066FF`（brand-500）
  - 聚焦背景：白色（surface-card）

### Date Format 日期格式

- 标签：Date Format
  - 样式：同 Language
- 控件：下拉选择器（Select）
- 当前值：MM/DD/YYYY
- 下拉选项：
  - MM/DD/YYYY
  - DD/MM/YYYY
  - YYYY-MM-DD
  - DD.MM.YYYY
  - YYYY/MM/DD
- 控件样式：同 Language

### Page Format 页面格式

- 标签：Page Format
  - 样式：同 Language
- 控件：下拉选择器（Select）
- 当前值：US Letter
- 下拉选项：
  - US Letter
  - A4
  - Legal
- 控件样式：同 Language

## 交互行为

- 修改任一下拉值后，立即更新全局 settings 状态
- 无需手动保存按钮，选择即生效
