# Photo 照片

## 组件概览

- 组件名称：PhotoPanel
- 所属面板：Photo 照片（侧边导航第 11 项）
- 容器样式：白色圆角卡片，轻微阴影
- 内边距：24px（p-6）
- 状态：📝 功能规划（无截图参考）

## 标题区

- 文案：Photo 照片
- 样式：深紫色，18px，extrabold

## Show Photo 显示照片

### 标签

- 文案：Show Photo 显示照片
- 样式：深紫色，14px，bold

### 控件

- 类型：开关（Toggle Switch）
- 默认值：开启
- 关闭时隐藏简历中的头像
- 开关样式：
  - 轨道宽 44px，高 24px，圆角 12px
  - 开启：品牌色背景，白色圆形滑块在右侧
  - 关闭：灰色背景，白色圆形滑块在左侧

## Photo Shape 照片形状

### 标签

- 文案：Photo Shape 照片形状
- 样式：深紫色，14px，bold

### 选项

- 控件类型：横排 3 个图标按钮
- 选项：
  - **Circle** 圆形：圆形缩略图预览
  - **Square** 方形：方形缩略图预览
  - **Rounded** 圆角方形：圆角方形缩略图预览
- 选中样式：品牌色背景 + 品牌色边框

## Photo Size 照片尺寸

### 标签

- 文案：Photo Size 照片尺寸

### 控件

- 类型：步进滑块（SteppedSlider，同 Font Size 面板）
- 范围：Small / Medium / Large
- 影响头像在简历中的显示尺寸

## Photo Position 照片位置

### 标签

- 文案：Photo Position 照片位置

### 选项

- 控件类型：横排 2 个选项卡
- 选项：
  - **In Header** 页眉内
  - **Sidebar Top** 侧栏顶部（双列布局时可用）

## Photo Border 照片边框

### 标签

- 文案：Photo Border 照片边框

### 选项

- 控件类型：横排 3 个选项
- 选项：
  - **None** 无边框
  - **Thin** 细线边框
  - **Shadow** 阴影

## 交互行为

- 开关 Show Photo → 立即在预览中显示/隐藏头像
- 切换形状/尺寸/位置/边框 → 实时更新预览
- 无照片上传时显示占位图标
