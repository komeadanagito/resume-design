# Footer 页脚

## 组件概览

- 组件名称：FooterPanel
- 所属面板：Footer 页脚（侧边导航第 13 项）
- 容器样式：白色圆角卡片，轻微阴影
- 内边距：24px（p-6）
- 状态：📝 功能规划（无截图参考）

## 标题区

- 文案：Footer 页脚
- 样式：深紫色，18px，extrabold

## Show Footer 显示页脚

### 标签

- 文案：Show Footer 显示页脚
- 样式：深紫色，14px，bold

### 控件

- 类型：开关（Toggle Switch）
- 默认值：关闭
- 开启时在简历底部展示页脚区域

## Page Numbers 页码

### 标签

- 文案：Page Numbers 页码
- 样式：深紫色，14px，bold

### 控件

- 类型：开关（Toggle Switch）
- 默认值：关闭
- 开启时在页脚显示页码（如 "1 / 2"）
- 仅在 Show Footer 开启时可用（否则禁用态）

## Footer Text 页脚文字

### 标签

- 文案：Footer Text 页脚文字
- 样式：深紫色，14px，bold

### 控件

- 类型：文本输入框（Input）
- 样式：同表单 Input 组件
- 占位文案：Enter footer text 请输入页脚文字
- 最大长度：100 字符
- 仅在 Show Footer 开启时可用

## Footer Alignment 页脚对齐

### 标签

- 文案：Alignment 对齐
- 样式：深紫色，14px，bold

### 选项

- 控件类型：横排 3 个图标按钮
- 选项：
  - 左对齐（AlignLeft 图标）
  - 居中（AlignCenter 图标）
  - 右对齐（AlignRight 图标）
- 默认：居中
- 选中样式：品牌色背景 + 品牌色边框

## Footer Separator 页脚分隔线

### 标签

- 文案：Separator 分隔线

### 控件

- 类型：开关（Toggle Switch）
- 默认值：关闭
- 开启时在页脚顶部展示分隔线
- 仅在 Show Footer 开启时可用

## 交互行为

- Show Footer 关闭时，下方所有控件显示为禁用态（opacity 降低，不可交互）
- Show Footer 开启时，所有控件恢复正常
- 所有更改即时反映到右侧预览
