# Links 链接

## 组件概览

- 组件名称：LinksPanel
- 所属面板：Links 链接（侧边导航第 12 项）
- 容器样式：白色圆角卡片，轻微阴影
- 内边距：24px（p-6）
- 状态：📝 功能规划（无截图参考）

## 标题区

- 文案：Links 链接
- 样式：深紫色，18px，extrabold

## Link Color 链接颜色

### 标签

- 文案：Link Color 链接颜色
- 样式：深紫色，14px，bold

### 控件

- 类型：颜色选择器（色块 + 十六进制输入框）
- 默认：跟随强调色
- 可自定义

## Link Style 链接样式

### 标签

- 文案：Link Style 链接样式
- 样式：深紫色，14px，bold

### 选项

- 控件类型：横排按钮组（SegmentedControl）
- 选项：
  - **Underline** 下划线：链接文字带下划线
  - **No decoration** 无装饰：链接文字无特殊样式
  - **Bold** 粗体：链接文字加粗

## Link Icons 链接图标

### 标签

- 文案：Show link icons 显示链接图标
- 样式：深紫色，14px，bold

### 控件

- 类型：开关（Toggle Switch）
- 默认值：开启
- 开启时在链接文字前显示对应平台图标（如 LinkedIn 图标、GitHub 图标等）

## URL Display URL 显示

### 标签

- 文案：URL Display URL 显示方式
- 样式：深紫色，14px，bold

### 选项

- 控件类型：下拉选择器（Select）
- 选项：
  - **Full URL** 完整 URL：显示完整链接地址
  - **Display text** 显示文字：仅显示自定义文字
  - **Hidden** 隐藏：不显示 URL（仅在导出 PDF 时保留超链接）

## 交互行为

- 所有更改即时反映到右侧预览
- 链接图标支持常见平台自动识别（LinkedIn、GitHub、个人网站等）
