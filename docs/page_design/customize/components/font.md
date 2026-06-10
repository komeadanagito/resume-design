# Font 字体

## 组件概览

- 组件名称：FontPanel
- 所属面板：Font 字体（侧边导航第 8 项）
- 容器样式：白色圆角卡片，轻微阴影
- 内边距：24px（p-6）
- 状态：✅ 基于截图

## 标题区

- 文案：Font 字体
- 样式：深紫色（ink-900），18px，extrabold

---

## Body Font 正文字体

### 标签

- 文案：Body Font 正文字体
- 样式：深紫色，14px，bold

### 控件

- 类型：下拉选择器（Select）
- 当前值：Alegreya（以 Alegreya 字体渲染显示）
- 样式：同 Document Settings 的下拉控件
  - 背景：`#F8F6F3`（surface-muted）
  - 圆角：12px（rounded-xl）
  - 内边距：12px 16px
  - 文字色：`#1D102C`（ink-900）
  - 右侧图标：下拉箭头（ChevronDown）
  - 聚焦时边框变品牌色

### 字体选项列表

- Alegreya（当前选中）
- Inter
- Roboto
- Open Sans
- Lato
- Montserrat
- Merriweather
- Playfair Display
- Source Sans Pro
- Noto Sans SC
- Raleway
- PT Serif
- Libre Baskerville

> 每个选项文字应以对应字体渲染显示，便于预览

---

## Name Font 姓名字体

### 标签

- 文案：Name Font 姓名字体
- 样式：深紫色，14px，bold

### 控件

- 类型：下拉选择器（Select）
- 当前值：Same as body font（以斜体/灰色显示，表示跟随正文字体）
- 样式：同 Body Font 的下拉控件

### 字体选项列表

- **Same as body font**（默认，跟随 Body Font 设置）
- （其余选项同 Body Font 列表）

---

## 交互行为

- 切换 Body Font → 简历正文字体立即更新
- 切换 Name Font → 简历顶部姓名字体独立更新
- Name Font 选择 "Same as body font" 时自动跟随 Body Font 变化
- 所有更改实时反映到右侧预览
- 下拉选项以对应字体渲染，便于预览选择
