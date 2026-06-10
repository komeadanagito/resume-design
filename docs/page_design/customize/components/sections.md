# Sections 模块

## 组件概览

- 组件名称：SectionsPanel
- 所属面板：Sections 模块（侧边导航第 14 项，最后一项）
- 容器：此面板较为特殊，不再使用外层的大号白色卡片包裹，而是直接在侧边栏右侧区域以无背景的形式排列卡片列表。
- 状态：✅ 基于截图

## 标题区

- 顶部无大标题，而是直接显示：**Section Customizations**
- 样式：深紫色（ink-900），18px，extrabold
- 右侧有一个向上折叠的箭头图标（ChevronUp），暗示这是一个可折叠面板或者顶部导航层级。

## 模块列表 (Section Cards)

此区域由一系列独立的白色圆角卡片垂直堆叠而成。每一张卡片代表简历中的一个大模块（如 Skills, Education 等）。

### 布局规则

- 卡片间距：12px（gap-3）或 16px（gap-4）
- 卡片宽度：填满右侧面板可用空间

### 单个卡片样式

- 背景：白色（surface-card）
- 圆角：12px（rounded-xl）
- 阴影：轻微阴影（shadow-sm / card shadow）
- 内边距：24px（p-6）
- 内容布局：垂直排列（标题在上方，副标题在下方）

#### 标题

- 内容：对应模块名称（如 **Skills**, **Languages**, **Interests** 等）
- 样式：深紫色（ink-900），16px，bold

#### 提示文字/副标题

- 内容：`To see design options, add [模块名].`（例如：`To see design options, add skills.`）
- 样式：灰色（ink-500），14px

### 截图展示的模块顺序（从上到下）

1. **Skills** (To see design options, add skills.)
2. **Languages** (To see design options, add languages.)
3. **Interests** (To see design options, add interests.)
4. **Certificates** (To see design options, add certificates.)
5. **Summary** (To see design options, add a summary.)
6. **Education** (To see design options, add education.)
7. **Work Experience** (To see design options, add work experience.)
8. **Declaration** (To see design options, add a declaration.)

## 状态分析

截图中展示的是各模块在**"未添加内容"**（Empty State）时的样式。
提示文字说明：一旦用户在 Content 面板中添加了对应的模块内容，这些卡片将会展开或展示对应的设计选项（例如针对该模块特定的间距、布局或排序控件）。

## 交互推断（基于提示文字）

- 点击卡片：可能无响应，或跳转至 Content 面板添加内容。
- 内容添加后：卡片内容应该会发生变化，展示针对该特定模块的高级定制选项（如：是否显示图标、模块内的条目布局等）。
- 排序交互：截图未显示明确的拖拽手柄，可能排序功能被移至全局 Layout 面板，或者在内容填充后才会显示拖拽把手。

*(注：此处设计与先前的推测有较大不同，先前的推测是一个统一的列表带开关，实际设计是每个模块一张独立的大卡片)*
