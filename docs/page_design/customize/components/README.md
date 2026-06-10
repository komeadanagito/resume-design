# Customize 子面板样式组件文档

本目录包含 Customize 定制页面中每个子导航面板的详细样式与功能描述。每个文件对应一个面板组件，基于实际截图提取。

## 文件列表

| 文件 | 面板 | 状态 |
|------|------|------|
| [document_settings.md](./document_settings.md) | Document Settings 文档设置 | ✅ 基于截图 |
| [design_templates.md](./design_templates.md) | Design Templates 设计模板 | ✅ 基于截图 |
| [layout.md](./layout.md) | Layout 布局 | ✅ 基于截图 |
| [font_size.md](./font_size.md) | Font Size 字号 | ✅ 基于截图 |
| [spacing.md](./spacing.md) | Spacing 间距 | ✅ 基于截图 |
| [entries.md](./entries.md) | Entries 条目 (Entry Layout) | ✅ 基于截图 |
| [headings.md](./headings.md) | Section Headings 章节标题 | ✅ 基于截图 |
| [font.md](./font.md) | Font 字体 | ✅ 基于截图 |
| [colors.md](./colors.md) | Colors 颜色 | ✅ 基于截图 |
| [header.md](./header.md) | Header 页眉 | ✅ 基于截图 |
| [sections.md](./sections.md) | Section Customizations 模块 | ✅ 基于截图 |
| [photo.md](./photo.md) | Photo 照片 | 📝 功能规划 |
| [links.md](./links.md) | Links 链接 | 📝 功能规划 |
| [footer.md](./footer.md) | Footer 页脚 | 📝 功能规划 |

## 通用样式规范

- **卡片容器**：白色圆角卡片（border-radius: 24px），轻微阴影（`0 4px 16px rgba(29,16,44,0.06)`）
- **面板标题**：深紫色（`#1D102C`），特大号粗体（extrabold）
- **字段标签**：深紫色（`#1D102C`），小号粗体（bold）
- **正文/描述**：灰色（`#5C5564` 或 `#8B8297`）
- **品牌色**：`#0066FF`（主蓝）用于选中态、活动控件
- **背景色**：`#F5F7FA`（页面）、`#F8F6F3`（输入框/控件背景）

## 通用交互控件

### 药丸按钮组（Pill Button Group）

多个面板共用的选择器组件：

- **形状**：药丸圆角（rounded-pill / 999px）
- **未选中**：白色背景，灰色文字（ink-500），浅灰边框（surface-tag）
- **选中**：浅品牌色背景（brand-50），品牌色文字（brand-500），品牌色边框
- **使用场景**：Entries、Headings、Header 等面板

### 缩略图选择卡片（Thumbnail Card Selector）

- **形状**：圆角 12px
- **未选中**：白色背景，浅灰边框
- **选中**：浅品牌色背景，品牌色边框，内部图示变品牌色
- **使用场景**：Layout、Entries、Headings、Header 等面板

### 步进滑块（Stepped Slider）

- 9 格轨道 + 加减按钮
- 详见 [font_size.md](./font_size.md)
- **使用场景**：Font Size、Spacing 面板
