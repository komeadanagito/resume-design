# Spacing 间距

## 组件概览

- 组件名称：SpacingPanel
- 所属面板：Spacing 间距（侧边导航第 5 项）
- 容器样式：白色圆角卡片，轻微阴影
- 内边距：24px（p-6）

## 标题区

- 文案：Spacing 间距
- 样式：深紫色，18px，extrabold

## 控件模式

与 Font Size 面板完全相同的 **步进滑块 + 加减按钮** 模式（SteppedSlider 复用组件）。

详细样式规范请参考 [font_size.md](./font_size.md) 中的「通用步进滑块样式」章节。

## 间距字段列表

字段间距：24px（gap-6），垂直排列。

### Line Height 行高

- 标签：Line Height 行高
- 数值显示：`1.15`（无单位，行高倍数）
- 滑块位置：第 2 格（偏左）
- 步进范围：1.0 ~ 2.0，步长 0.05 或 0.1
- 影响：简历正文行间距

### Space Between Elements 元素间距

- 标签：Space Between Elements 元素间距
- 数值显示：`[––]`（当前值的可视化表示，表示紧凑 / 较小间距）
- 滑块位置：第 2 格（偏左）
- 步进范围：多级预设（如 Compact / Normal / Relaxed / Spacious）
- 影响：各内容元素（条目、段落）之间的垂直间距

### Left & Right Margin 左右边距

- 标签：Left & Right Margin 左右边距
- 数值显示：`22mm`
- 滑块位置：第 6 格（偏右）
- 步进范围：10mm ~ 35mm，步长 2mm
- 影响：简历页面左右页边距

### Top & Bottom Margin 上下边距

- 标签：Top & Bottom Margin 上下边距
- 数值显示：`12mm`
- 滑块位置：第 2 格（偏左）
- 步进范围：5mm ~ 30mm，步长 2mm
- 影响：简历页面上下页边距

## 交互行为

- 与 Font Size 面板相同的交互模式：
  - 点击格子 → 跳转
  - 点击 +/− → 步进
  - 边界禁用
  - 实时预览更新
