# Design Templates 设计模板

## 组件概览

- 组件名称：DesignTemplatesCard
- 所属面板：Document 文档
- 位置：Document Settings 卡片下方
- 容器样式：白色圆角卡片，轻微阴影
- 内边距：24px（p-6）

## 标题区

- 文案：Design Templates 设计模板
- 样式：深紫色，18px，extrabold
- 下方间距：4px（mb-1）

## 描述文字

- 文案：Update your entire resume design with one click 一键更新你的简历设计
- 样式：灰色（ink-500），14px
- 末尾图标：蓝色闪光/验证图标（Sparkles），内联显示
- 下方间距：16px（mb-4）

## 模板缩略图预览区

- 容器：
  - 背景：浅灰（surface-muted / `#F8F6F3`）
  - 圆角：12px（rounded-xl）
  - 内边距：20px 16px（py-5 px-4）
  - 布局：横排，等间距排列

- 缩略图数量：5 个（截图可见 5 个不同模板预览）
- 单个缩略图样式：
  - 尺寸：约 100px × 140px（宽高比接近 A4 纸比例）
  - 背景：白色
  - 圆角：8px（rounded-lg）
  - 阴影：card shadow
  - 内容：简历缩略预览，含：
    - 顶部姓名区（深色文字）
    - 头像占位（小圆形照片）
    - 多行内容区（灰色横线/色块模拟文字）
    - 不同布局风格（单列、双列、带侧栏等）
  - 悬停效果：阴影增强（shadow-cardHover）

## Browse templates 浏览模板按钮

- 位置：缩略图区域中央偏下，覆盖在缩略图之上
- 文案：Browse templates 浏览模板
- 样式：
  - 背景：白色（surface-card）
  - 文字：深紫色（ink-900），14px，semibold
  - 边框：`surface-tag`（`#F0ECE7`）色描边
  - 圆角：12px（rounded-xl）
  - 内边距：10px 20px（py-2.5 px-5）
  - 悬停效果：背景变为 `surface-muted`

## 交互行为

- 点击 Browse templates 按钮：打开模板浏览弹窗（后续实现）
- 点击单个模板缩略图：直接应用该模板（后续实现）
- 当前使用的模板应有选中指示（蓝色边框或勾选标记）
