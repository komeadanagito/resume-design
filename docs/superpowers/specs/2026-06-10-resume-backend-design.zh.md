# Resume Studio — 后端设计文档（中文）

| 字段     | 内容                                                                              |
| -------- | --------------------------------------------------------------------------------- |
| 文档版本 | v1.0                                                                              |
| 创建日期 | 2026-06-10                                                                        |
| 状态     | Draft（待用户审阅）                                                               |
| 关联文档 | PRD（同目录同日）、前端 spec（同目录同日）                                        |
| 已实现部分 | `crates/resume-core`、`crates/resume-render-markdown`、`apps/resume-app/src-tauri`（slice 0–1）|

---

## 0. 修订记录

| 版本 | 日期       | 修订人 | 说明                          |
| ---- | ---------- | ------ | ----------------------------- |
| v1.0 | 2026-06-10 | claude | 初稿，覆盖完整产品后端全部模块 |

---

## 1. 目标与非目标

### 目标

- 给 Resume Studio 完整产品提供一份 Rust 工程蓝图：从 crate 拆分 → 数据模型 → 序列化 → 多 renderer → Tauri 命令 → AI / ATS 服务 → 错误模型 → 测试。
- 让后续每一次新增能力都是「**加一个 crate** 或 **加一个文件**」，**不重写既有 crate**。
- 给前端一份稳定的命令契约（Tauri command 接口 + 错误形态）。

### 非目标

- 不写云端服务设计（v1.0 全本地）。
- 不重述 PRD 的产品需求。
- 不涵盖前端 React 实现（见前端 spec）。
- 不写 CI / 发布流程细节（独立运维文档）。

---

## 2. Workspace 蓝图

### 2.1 现有结构（slice 0–1 已落地）

```
Cargo.toml                               # [workspace]
crates/
├── resume-core/                         # 数据模型 + io + Renderer trait
└── resume-render-markdown/              # Markdown 渲染实现
apps/
└── resume-app/
    └── src-tauri/                       # Tauri 应用壳 + 命令注册
examples/sample.json
```

### 2.2 完整产品的目标结构

```
crates/
├── resume-core/                ✅ 已存在；扩展 15 类 section + ResumeSettings + CoverLetter 模型
├── resume-render-markdown/     ✅ 已存在
├── resume-render-html/         📋 新增；HTML + inline CSS 渲染
├── resume-render-pdf/          📋 新增；HTML → PDF（路径见 §6.4）
├── resume-render-docx/         📋 新增；docx-rs 写入
├── resume-templates/           📋 新增；模板包元数据 + 加载（内置 + 用户）
├── resume-ai/                  📋 新增；Anthropic API 客户端 + 三个能力（polish / rewrite / cover）
├── resume-ats/                 📋 新增；纯 Rust 评分规则引擎
└── resume-cover/               📋 新增；Cover Letter 数据模型与渲染
apps/
└── resume-app/src-tauri/       ✅ 已存在；命令矩阵随 crate 扩张
```

### 2.3 依赖方向（单向 fanout，禁止反向）

```
resume-core
   ▲
   │
   ├── resume-render-markdown
   ├── resume-render-html
   │       ▲
   │       ├── resume-render-pdf      （用 HTML 输出，再转 PDF）
   │       └── resume-render-docx     （独立解析数据模型）
   ├── resume-templates                （只依赖 core 的模型，给 render-html 用）
   ├── resume-ai                       （只依赖 core 的模型 + Cover Letter 模型）
   ├── resume-ats                      （只依赖 core）
   └── resume-cover                    （只依赖 core）
                ▲
                │
       apps/resume-app/src-tauri       （依赖全部 lib crate，提供命令）
```

**理由**：

- 任何 renderer 出问题，core 与其他 renderer 不受影响。
- 新增能力是新 crate，不动旧 crate 的 lib.rs。
- 单向方向保证编译时间最小化。

### 2.4 workspace 依赖（节选）

```toml
[workspace.dependencies]
serde       = { version = "1", features = ["derive"] }
serde_json  = "1"
thiserror   = "1"
tempfile    = "3"
ts-rs       = "10"
tauri       = { version = "2" }
tauri-build = { version = "2" }

# 完整产品新增（按 crate 加）
tera        = "1"          # resume-render-html 模板
askama      = "0.12"       # 备选模板引擎
docx-rs     = "0.4"        # resume-render-docx
keyring     = "2"          # AI key 安全存储
reqwest     = { version = "0.12", default-features = false, features = ["json", "rustls-tls", "stream"] }
tokio       = { version = "1", features = ["sync", "macros"] }
chrono      = { version = "0.4", default-features = false }
uuid        = { version = "1", features = ["v4", "serde"] }
trash       = "5"          # 删除走系统回收站
```

---

## 3. 核心数据模型 `resume-core::model`

### 3.1 顶层结构

```rust
pub struct Resume {
    pub meta: ResumeMeta,
    pub personal: PersonalInfo,
    pub sections: Vec<Section>,
}

pub struct ResumeMeta {
    pub schema_version: String,   // "0.2.0"（含完整 section 后跳版本）
    pub id: String,               // UUID v4，文件名同此
    pub name: String,             // 用户可见名
    pub locale: String,           // "zh-CN" / "en-US" / ...
    pub created_at: String,       // RFC3339
    pub updated_at: String,       // RFC3339
}

pub struct PersonalInfo {
    pub full_name: String,
    pub title: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub location: Option<String>,
    pub photo: Option<String>,    // 相对路径，如 "photos/<id>.jpg"
    pub extras: Vec<ExtraField>,
}

pub struct ExtraField {
    pub key: String,     // "linkedin" / "website" / "github" / ...
    pub label: String,   // 显示文本
    pub value: String,
}
```

### 3.2 Section 封闭 enum（v1.0 完整 15 变体）

```rust
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum Section {
    Summary(SummarySection),
    Experience(ExperienceSection),
    Education(EducationSection),
    Skills(SkillsSection),
    Projects(ProjectsSection),
    Languages(LanguagesSection),
    Certifications(CertificationsSection),
    Interests(InterestsSection),
    Awards(AwardsSection),
    Publications(PublicationsSection),
    References(ReferencesSection),
    Volunteering(VolunteeringSection),
    Courses(CoursesSection),
    Custom(CustomSection),
    Header(HeaderSection),
}

pub enum SectionKind {
    Summary, Experience, Education, Skills,
    Projects, Languages, Certifications, Interests,
    Awards, Publications, References, Volunteering,
    Courses, Custom, Header,
}

impl Section {
    pub fn kind(&self) -> SectionKind { /* exhaustive match */ }
}
```

**为什么用封闭 enum 而不是 `Box<dyn Section>`**：

- 编译期穷尽 match：每个 renderer 必须显式处理新加的 kind，否则编译失败。
- 序列化干净：`#[serde(tag = "type")]` 直接产出 `{ "type": "experience", "items": [...] }`。
- 零运行时分发开销。
- 添加新 kind 在 IDE / grep 上有显式中心点。

### 3.3 各 section payload 类型

```rust
pub struct SummarySection { pub content: String }

pub struct ExperienceSection { pub items: Vec<ExperienceItem> }
pub struct ExperienceItem {
    pub company: String,
    pub role: String,
    pub start: Option<String>,    // 用户原文，不解析
    pub end: Option<String>,      // "Present" 也合法
    pub location: Option<String>,
    pub bullets: Vec<String>,
}

pub struct EducationSection { pub items: Vec<EducationItem> }
pub struct EducationItem {
    pub school: String,
    pub degree: Option<String>,
    pub field: Option<String>,
    pub location: Option<String>,
    pub start: Option<String>,
    pub end: Option<String>,
    pub honors: Vec<String>,
}

pub struct SkillsSection { pub groups: Vec<SkillGroup> }
pub struct SkillGroup { pub name: String, pub items: Vec<String> }

pub struct ProjectsSection { pub items: Vec<ProjectItem> }
pub struct ProjectItem {
    pub name: String,
    pub link: Option<String>,
    pub role: Option<String>,
    pub start: Option<String>,
    pub end: Option<String>,
    pub description: Option<String>,
    pub tech: Vec<String>,
}

pub struct LanguagesSection { pub items: Vec<LanguageItem> }
pub struct LanguageItem {
    pub name: String,
    pub level: Option<String>,    // CEFR ("B2") 或中文 ("熟练")，不约束格式
}

pub struct CertificationsSection { pub items: Vec<CertificationItem> }
pub struct CertificationItem {
    pub name: String,
    pub issuer: Option<String>,
    pub date: Option<String>,
    pub credential_id: Option<String>,
    pub link: Option<String>,
}

pub struct InterestsSection { pub items: Vec<String> }

pub struct AwardsSection { pub items: Vec<AwardItem> }
pub struct AwardItem {
    pub name: String,
    pub issuer: Option<String>,
    pub date: Option<String>,
    pub description: Option<String>,
}

pub struct PublicationsSection { pub items: Vec<PublicationItem> }
pub struct PublicationItem {
    pub title: String,
    pub authors: Option<String>,
    pub venue: Option<String>,
    pub date: Option<String>,
    pub link: Option<String>,
}

pub struct ReferencesSection { pub items: Vec<ReferenceItem> }
pub struct ReferenceItem {
    pub name: String,
    pub relation: Option<String>,
    pub contact: Option<String>,
}

pub struct VolunteeringSection { pub items: Vec<VolunteeringItem> }
pub struct VolunteeringItem {
    pub org: String,
    pub role: Option<String>,
    pub start: Option<String>,
    pub end: Option<String>,
    pub bullets: Vec<String>,
}

pub struct CoursesSection { pub items: Vec<CourseItem> }
pub struct CourseItem {
    pub name: String,
    pub provider: Option<String>,
    pub date: Option<String>,
    pub link: Option<String>,
}

pub struct CustomSection {
    pub title: String,                    // 用户自定义
    pub items: Vec<CustomItem>,
}
pub struct CustomItem { pub label: String, pub value: String }

pub struct HeaderSection {
    // 非数据 section，是显隐与字段顺序的开关；数据共用 PersonalInfo
    pub show_photo: bool,
    pub field_order: Vec<String>,         // ["full_name", "title", "email", ...]
}
```

**通用约定**：

- 所有可选文本字段 `Option<String>` + `#[serde(skip_serializing_if = "Option::is_none")]`，JSON 体积最小。
- 所有 `Vec<T>` 可为空但不可为 None（默认空 vec）。
- 日期不解析为 `chrono::Date`，**保留用户原文**，因为 "Present" / "2024 春" / 中英混合都是合法用户输入。

### 3.4 `ResumeSettings` 完整模型

```rust
pub struct ResumeSettings {
    pub resume_id: String,                          // 关联到 Resume.meta.id
    pub language: String,                           // "zh-CN" 等（与 meta.locale 通常同步）
    pub date_format: String,                        // "MM/DD/YYYY" 等
    pub page_format: String,                        // "us-letter" / "a4" / "legal"
    pub template_id: String,                        // "minimal" / "compact" / ...

    pub layout: LayoutSettings,
    pub font_size: FontSizeSettings,
    pub spacing: SpacingSettings,
    pub entries: EntriesSettings,
    pub headings: HeadingsSettings,
    pub font: FontSettings,
    pub colors: ColorsSettings,
    pub header: HeaderSettings,
    pub photo: PhotoSettings,
    pub links: LinksSettings,
    pub footer: FooterSettings,

    pub section_order: Vec<String>,                 // section kind 顺序
    pub section_visibility: HashMap<String, bool>,  // kind → 显隐
}

pub struct LayoutSettings { pub columns: u8, pub sidebar_width: u8, pub flip: bool }
pub struct FontSizeSettings { pub scale: f32, pub heading: f32, pub body: f32, pub meta: f32 }
pub struct SpacingSettings { pub line: f32, pub paragraph: f32, pub card: f32, pub page_margin: f32 }
pub struct EntriesSettings { pub alignment: String, pub date_align: String, pub bullet_style: String }
pub struct HeadingsSettings { pub style: String, pub underline: bool, pub color_block: bool }
pub struct FontSettings { pub en: String, pub zh: String }
pub struct ColorsSettings { pub primary: String, pub text: String, pub background: String }
pub struct HeaderSettings { pub show_photo: bool, pub name_size: u32, pub contact_layout: String }
pub struct PhotoSettings { pub shape: String, pub border: bool, pub shadow: bool }
pub struct LinksSettings { pub style: String, pub show_url: bool }
pub struct FooterSettings { pub enabled: bool, pub content: String }
```

每份简历对应一份 `ResumeSettings`，存放在 `<resumeId>.settings.json`。

### 3.5 Cover Letter 模型（`resume-cover::model`）

```rust
pub struct CoverLetter {
    pub id: String,
    pub resume_id: String,         // 关联简历，可空表示独立
    pub name: String,
    pub locale: String,
    pub created_at: String,
    pub updated_at: String,
    pub recipient: Option<Recipient>,
    pub blocks: Vec<CoverBlock>,   // 段落 / 标题 / 列表
    pub signature: Option<String>,
}

pub struct Recipient {
    pub name: Option<String>,
    pub title: Option<String>,
    pub company: Option<String>,
    pub address: Option<String>,
}

#[serde(tag = "type", rename_all = "camelCase")]
pub enum CoverBlock {
    Paragraph(ParagraphBlock),
    Heading(HeadingBlock),
    List(ListBlock),
}
```

### 3.6 ATS 报告模型（`resume-ats::model`）

```rust
pub struct AtsReport {
    pub generated_at: String,
    pub total: u32,                          // 0-100
    pub dimensions: Vec<AtsDimension>,
    pub suggestions: Vec<AtsSuggestion>,
    pub matched_keywords: Vec<String>,
    pub missing_keywords: Vec<String>,
}

pub struct AtsDimension {
    pub name: String,        // "keyword" / "length" / "structure" / "format"
    pub score: u32,          // 0-100
    pub weight: f32,         // 权重，dimensions 加权 = total
    pub details: Vec<String>,
}

pub struct AtsSuggestion {
    pub severity: String,                       // "info" / "warn" / "error"
    pub message: String,
    pub section_ref: Option<AtsSectionRef>,     // 关联到 section 编辑入口
}

pub struct AtsSectionRef {
    pub kind: SectionKind,
    pub index: usize,
    pub field: Option<String>,
}
```

### 3.7 多简历索引（`MultiResumeIndex`）

```rust
pub struct MultiResumeIndex {
    pub schema_version: String,
    pub resumes: Vec<ResumeIndexEntry>,
    pub cover_letters: Vec<CoverLetterIndexEntry>,
}

pub struct ResumeIndexEntry {
    pub id: String,
    pub name: String,
    pub locale: String,
    pub updated_at: String,
}

pub struct CoverLetterIndexEntry {
    pub id: String,
    pub resume_id: Option<String>,
    pub name: String,
    pub updated_at: String,
}
```

存放在 `appData/index.json`，由 `list_resumes` / `new_resume` 等命令维护。**索引和实际文件之间出现不一致时以扫描实际目录为准**，索引仅是缓存。

---

## 4. 序列化 `io.rs`

### 4.1 已实现接口（slice 0）

```rust
pub fn load_json(path: &Path) -> Result<Resume, CoreError>;
pub fn save_json(resume: &Resume, path: &Path) -> Result<(), CoreError>;
pub fn from_json_str(s: &str) -> Result<Resume, CoreError>;
pub fn to_json_string(resume: &Resume) -> Result<String, CoreError>;
```

### 4.2 完整版扩展

```rust
// Settings 持久化
pub fn load_settings(path: &Path) -> Result<ResumeSettings, CoreError>;
pub fn save_settings(s: &ResumeSettings, path: &Path) -> Result<(), CoreError>;

// 索引
pub fn load_index(path: &Path) -> Result<MultiResumeIndex, CoreError>;
pub fn save_index(idx: &MultiResumeIndex, path: &Path) -> Result<(), CoreError>;

// Cover Letter
pub fn load_cover(path: &Path) -> Result<CoverLetter, CoreError>;
pub fn save_cover(c: &CoverLetter, path: &Path) -> Result<(), CoreError>;
```

### 4.3 原子写入

```rust
fn save_json<T: Serialize>(value: &T, path: &Path) -> Result<(), CoreError> {
    fs::create_dir_all(path.parent().expect("path has parent"))?;
    let tmp = tempfile::NamedTempFile::new_in(path.parent().unwrap())?;
    serde_json::to_writer_pretty(tmp.as_file(), value)?;
    tmp.persist(path).map_err(|e| CoreError::Io(e.error))?;
    Ok(())
}
```

**为什么 tempfile + persist**：

- 写入失败时旧文件不被破坏（崩溃 / 断电 / 磁盘满都不污染）。
- `persist` 在同目录下用 rename，原子语义。
- 同时 `create_dir_all` 让首次保存到一个不存在的目录也不报错。

### 4.4 备份策略

每次保存时同时写一份带时间戳的副本到 `<resumeId>.backups/<rfc3339>.json`，最多保留 10 份，超过删除最旧（不删未来的）。这是 PRD 中「数据丢失」风险的兜底。

### 4.5 schema_version 演进

```rust
pub const SCHEMA_VERSION: &str = "0.2.0";

fn check_schema(s: &Resume) -> Result<(), CoreError> {
    if s.meta.schema_version != SCHEMA_VERSION {
        return Err(CoreError::SchemaMismatch {
            expected: SCHEMA_VERSION.to_string(),
            found: s.meta.schema_version.clone(),
        });
    }
    Ok(())
}
```

v1.0 不实现 migration，遇到旧版本直接返回错误。预留 `migrate(from, to, value)` 钩子函数签名，未来扩展点已确认。

---

## 5. 文件系统布局

### 5.1 总体目录

```
<appData>/Resume Studio/
├── index.json                          # MultiResumeIndex
├── settings.json                       # AppSettings（全局；非简历级）
├── resumes/
│   ├── <uuid-1>.json                   # Resume
│   ├── <uuid-1>.settings.json          # ResumeSettings
│   ├── <uuid-1>.ats-history.json       # ATS 历史
│   └── <uuid-1>.backups/
│       └── 2026-06-10T08:30:00Z.json
├── cover-letters/
│   └── <uuid>.json
├── photos/
│   └── <uuid>.<ext>
├── templates/                          # 用户加载的模板
│   └── <slug>/
│       ├── template.json               # TemplateMeta
│       ├── template.html.tera
│       └── template.css
└── logs/
    └── app-2026-06-10.log
```

### 5.2 路径解析（`apps/resume-app/src-tauri/src/paths.rs`）

```rust
pub fn app_data_dir(app: &AppHandle) -> Result<PathBuf, AppError>;
pub fn resumes_dir(app: &AppHandle) -> Result<PathBuf, AppError>;
pub fn resume_path(app: &AppHandle, id: &str) -> Result<PathBuf, AppError>;
pub fn settings_path(app: &AppHandle, id: &str) -> Result<PathBuf, AppError>;
pub fn photos_dir(app: &AppHandle) -> Result<PathBuf, AppError>;
pub fn templates_dir(app: &AppHandle) -> Result<PathBuf, AppError>;
pub fn cover_letters_dir(app: &AppHandle) -> Result<PathBuf, AppError>;
pub fn index_path(app: &AppHandle) -> Result<PathBuf, AppError>;
pub fn logs_dir(app: &AppHandle) -> Result<PathBuf, AppError>;
```

所有这些函数：

- 拼接路径前 `create_dir_all` 保证目录存在。
- 验证 id 仅含 `[a-zA-Z0-9-]`（防路径注入），不合法返回 `AppError::Path`。
- 用 `app.path()` 获取系统标准 appData 路径。

---

## 6. Renderer trait 与实现

### 6.1 Trait 定义（`resume-core::render`）

```rust
pub trait Renderer {
    type Output;
    type Error: std::error::Error + 'static;
    fn render(&self, resume: &Resume, settings: &ResumeSettings)
        -> Result<Self::Output, Self::Error>;
}
```

- `Output` 关联类型：Markdown / HTML → `String`；PDF / DOCX → `Vec<u8>`；预览 → `Vec<u8>` 或 `String`。
- `Error` 关联类型：每 renderer 自己的错误，互不污染。
- **加入 `&ResumeSettings` 参数**（相对于 slice 0 的纯 `&Resume`）：模板 / 颜色 / 字体均来自 settings，是渲染的真正输入。

### 6.2 `resume-render-markdown`（已实现）

- 纯文本输出。
- 不参考 settings（除 `section_order` / `section_visibility`）。
- 用作快速 round-trip 测试与 README 生成。

### 6.3 `resume-render-html`

```
resume-render-html/
├── src/
│   ├── lib.rs              HtmlRenderer struct, Renderer impl
│   ├── error.rs            HtmlError
│   ├── builtin.rs          内置模板的注册
│   └── tera_ctx.rs         把 Resume + Settings → Tera Context
└── templates/
    ├── base.html.tera      共用骨架（HTML + 基础 CSS 注入点）
    ├── minimal/            内置模板 1
    │   ├── template.json
    │   ├── content.html.tera
    │   └── styles.css.tera
    ├── compact/
    └── elegant/
```

**核心思路**：

1. 模板用 Tera（Rust 上成熟的 Jinja2 风格）。
2. 模板有两个文件：`content.html.tera`（HTML 结构）+ `styles.css.tera`（CSS，可读 settings 变量）。
3. 渲染时 inline CSS：`<style>...</style>` 嵌进 HTML，单文件输出。
4. 字体回退用 `font-family: "<setting>", -apple-system, "PingFang SC", "Noto Sans CJK SC", sans-serif`。

```rust
pub struct HtmlRenderer {
    templates: Templates,    // 内置 + 用户模板的注册表
}

impl Renderer for HtmlRenderer {
    type Output = String;
    type Error = HtmlError;

    fn render(&self, resume: &Resume, settings: &ResumeSettings) -> Result<String, HtmlError> {
        let template = self.templates.get(&settings.template_id)
            .ok_or(HtmlError::UnknownTemplate(settings.template_id.clone()))?;
        let ctx = build_context(resume, settings)?;
        let html_body = template.tera.render("content.html.tera", &ctx)?;
        let css      = template.tera.render("styles.css.tera",   &ctx)?;
        Ok(wrap(html_body, &css))
    }
}
```

### 6.4 `resume-render-pdf`

**路径决策表**：

| 方案                     | 优点                                   | 缺点                                       | 选择 |
| ------------------------ | -------------------------------------- | ------------------------------------------ | ---- |
| `headless_chrome` crate  | HTML/CSS 100% 还原；字体支持好         | 体积大（捆 Chromium）；启动慢            | △    |
| `weasyprint`（外部 bin） | HTML/CSS 渲染好；安装包小              | 需要 Python；非 Rust 单二进制              | △    |
| `wkhtmltopdf`（外部 bin）| 上手快                                 | 已停止维护                                 | ✗    |
| `typst` 自己写排版语言   | 性能极好；Rust 原生                    | 不复用 HTML 模板；维护两套模板             | ✗    |
| `printpdf` 自绘          | 纯 Rust 单二进制                       | 复杂版式实现工作量大；字体子集化复杂       | ✗    |
| **推荐：tauri 内置 webview 渲染 + `print_to_pdf`** | 复用 Tauri 已有 WebView；与 Preview 同一渲染源 | 需主线程调度 | **✓** |

**实现路径**：

```rust
// 在 Tauri command 中
async fn export_pdf(app: AppHandle, resume: Resume, settings: ResumeSettings)
    -> Result<Vec<u8>, AppError>
{
    let html = HtmlRenderer::default().render(&resume, &settings)?;
    let win  = build_offscreen_webview(&app, &html).await?;
    let pdf  = win.print_to_pdf(pdf_options(&settings)).await?;
    win.close()?;
    Ok(pdf)
}
```

**优势**：

- Preview iframe + PDF 导出走同一份 HTML，所见即所得。
- 不引入新的渲染引擎依赖（Tauri 已带 WebView）。
- 字体由 OS 提供（macOS / Win / Linux 各自系统字体 + 内置 NotoSansCJK 子集）。

**备选**：如果 Tauri `print_to_pdf` 不支持目标平台某些 PDF 选项，退到 `headless_chrome`（feature flag 切换）。

### 6.5 `resume-render-docx`

```rust
pub struct DocxRenderer;
impl Renderer for DocxRenderer {
    type Output = Vec<u8>;
    type Error = DocxError;
    // 用 docx-rs 拼段落；字体回退到系统字体；不追求像素级还原
}
```

DOCX 仅作为「便于他人 Word 内编辑」的导出，**不追求与 PDF / HTML 视觉一致**，文案明确告知用户。

---

## 7. Template 系统 `resume-templates`

### 7.1 模板包结构

```
templates/<slug>/
├── template.json           TemplateMeta（id, name, author, tags, preview_thumbnail）
├── content.html.tera       HTML 结构（必须）
├── styles.css.tera         CSS（必须）
└── preview.png             缩略图（可选）
```

### 7.2 TemplateMeta

```rust
pub struct TemplateMeta {
    pub id: String,           // slug，全局唯一
    pub name: String,         // 用户可见名（locale 字典）
    pub author: Option<String>,
    pub version: String,
    pub tags: Vec<String>,    // "minimal" / "compact" / "creative" / ...
    pub preview: Option<String>, // 相对路径
    pub builtin: bool,        // 区分内置 vs 用户加载
}
```

### 7.3 加载策略

```rust
pub fn list_templates(app: &AppHandle) -> Result<Vec<TemplateMeta>, AppError> {
    let mut result = builtin_templates();
    let user_dir = paths::templates_dir(app)?;
    if user_dir.exists() {
        for entry in fs::read_dir(&user_dir)? {
            let dir = entry?.path();
            if dir.is_dir() {
                if let Ok(meta) = load_template_meta(&dir) {
                    result.push(meta);
                }
            }
        }
    }
    Ok(result)
}
```

### 7.4 内置模板（v1.0 提供 4–8 套）

| ID         | 风格描述                        | 适合人群                |
| ---------- | ------------------------------- | ----------------------- |
| `minimal`  | 单列、无色块、衬线              | 学术、传统行业          |
| `compact`  | 双列、信息密度高、无色          | 工程师、内容多者        |
| `elegant`  | 单列、主色块、衬线              | 设计、市场              |
| `modern`   | 双列、侧栏色块、无衬线          | 互联网、产品            |

后续可扩展。

### 7.5 沙盒约束

- 模板 HTML 渲染时**禁用 `<script>` 标签**（白名单 HTML 元素）。
- 不允许引用远程 URL（`<link rel=...>` / `<img src=https://...>`）。
- 图片仅允许 `data:` URI 或简历内部相对路径 `photos/...`。
- CSS 允许全部属性，但 `@import` 被禁用。

---

## 8. AI 服务 `resume-ai`

### 8.1 Client trait

```rust
#[async_trait]
pub trait AiClient: Send + Sync {
    async fn polish_bullet(&self, input: PolishInput) -> AiResult<impl Stream<Item = AiResult<AiCandidate>>>;
    async fn rewrite_summary(&self, input: RewriteInput) -> AiResult<impl Stream<Item = AiResult<AiCandidate>>>;
    async fn draft_cover_letter(&self, input: CoverDraftInput) -> AiResult<impl Stream<Item = AiResult<CoverChunk>>>;
}
```

### 8.2 Anthropic 实现（v1.0 唯一实现）

```rust
pub struct AnthropicClient {
    api_key: String,
    base_url: String,           // 默认 https://api.anthropic.com
    model:    String,           // 默认 claude-sonnet-4-6
    client:   reqwest::Client,
}
```

**关键设计**：

- API Key 不存在 `AnthropicClient` 字段以外的地方；构造时从 keyring 取，使用后销毁。
- 所有调用走 streaming endpoint，输出流式 chunk。
- 用 `tokio::sync::mpsc` 把 reqwest stream 转成 `Stream<Item = AiResult<AiCandidate>>` 给上层。
- 超时：每次调用 60s 硬上限；连接超时 10s。

### 8.3 三种能力

#### 8.3.1 polish_bullet

输入：
```rust
pub struct PolishInput {
    pub bullet: String,
    pub role_context: Option<String>,    // 来自所在 Experience 的 role + company
    pub style: PolishStyle,              // Concise / Detailed / MetricDriven
    pub locale: String,                  // 输出语言
    pub n: u8,                            // 候选数，默认 3
}
pub enum PolishStyle { Concise, Detailed, MetricDriven }
```

prompt 中：

- system：「你是简历改写助手，输出 N 个候选，每个一行，不要解释」
- user：包含 bullet + 风格 + locale + role context

#### 8.3.2 rewrite_summary

输入：
```rust
pub struct RewriteInput {
    pub original: String,
    pub style: PolishStyle,
    pub locale: String,
    pub years_of_experience: Option<u8>,
}
```

输出：单条改写，流式。

#### 8.3.3 draft_cover_letter

输入：
```rust
pub struct CoverDraftInput {
    pub resume_summary: String,       // 简历精简摘要（Rust 端拼）
    pub jd: String,
    pub company: Option<String>,
    pub recipient_name: Option<String>,
    pub locale: String,
}
```

输出：流式 `CoverChunk`（每段一个 chunk）。

### 8.4 Prompt 集中管理

所有 prompt 模板放在 `resume-ai/prompts/`，按文件组织：

```
prompts/
├── polish-bullet.txt
├── rewrite-summary.txt
└── cover-letter.txt
```

- prompt 文件 include 进编译产物（`include_str!`），不依赖运行时文件读取。
- 修改 prompt = 改文件 + 重新编译；保证可审计。
- 每个 prompt 有 `{lang}` / `{style}` 等占位，用 `String::replace` 或 `formatx` 注入。

### 8.5 Key 存储（`keyring` crate）

```rust
pub fn store_key(key: &str) -> Result<(), KeyringError> {
    let entry = keyring::Entry::new("Resume Studio", "anthropic_api_key")?;
    entry.set_password(key)?;
    Ok(())
}
pub fn load_key() -> Result<Option<String>, KeyringError> {
    let entry = keyring::Entry::new("Resume Studio", "anthropic_api_key")?;
    match entry.get_password() {
        Ok(k) => Ok(Some(k)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(KeyringError::from(e)),
    }
}
```

**保证**：

- key 永不写到任何 JSON / log / 错误消息中。
- 错误日志只允许出现 key 的最后 4 位（验证用）。

---

## 9. ATS 服务 `resume-ats`

### 9.1 设计原则

- **纯本地、纯规则、无 LLM 依赖**。
- 输入 `(Resume, jd: &str)` → 输出 `AtsReport`。
- 离线可用，无需 API Key。

### 9.2 评分维度

| 维度名      | 权重 | 评估逻辑                                                                                       |
| ----------- | ---- | ---------------------------------------------------------------------------------------------- |
| keyword     | 0.45 | 从 JD 抽取 top-K 关键词；统计简历中（含 bullets、skills、summary）的覆盖率                     |
| length      | 0.15 | 总字数在合理区间（中文 600–1500 / 英文 300–800）；过短过长都扣分                                |
| structure   | 0.25 | 是否含 PersonalInfo 核心字段 + Summary / Experience / Education / Skills 四大块                |
| format      | 0.15 | 是否使用图片图标做核心信息（OCR 不友好）；是否含特殊 unicode 装饰字符等                          |

### 9.3 关键词抽取（中英文）

- **英文**：tokenize → 去停用词 → 词频 + 排除常见动词 → top-30。
- **中文**：用 `jieba-rs` 分词 → 去停用词 → top-30。
- 高级处理：n-gram 短语识别（如「Project Manager」「数据分析」）。

### 9.4 输出建议

每条 `AtsSuggestion` 包含：

```rust
{
  severity: "warn",
  message: "JD 中高频出现「项目管理」，简历未涉及。考虑在 Experience 中补充相关经历",
  section_ref: Some(AtsSectionRef { kind: Experience, index: 0, field: Some("bullets") }),
}
```

前端按 `section_ref` 跳转编辑。

### 9.5 性能

- 单次评分目标 ≤ 1 秒（10K 字 JD + 5K 字简历）。
- 不并发；同步函数即可。

---

## 10. Cover Letter `resume-cover`

### 10.1 模型

见 §3.5。

### 10.2 渲染

- Cover Letter 渲染复用 `resume-render-html` 与 `resume-render-pdf` 的能力，但用独立的 `cover-letter-templates/` 包。
- 与简历共用 Personal 信息：渲染时把简历的 `PersonalInfo` 注入 Cover Letter 模板 context。

### 10.3 与 Resume 的关联

- `CoverLetter.resume_id` 可为空（独立 Cover Letter）。
- 简历改名 / 删除时：
  - 改名：Cover Letter 引用不变。
  - 删除：Cover Letter 的 `resume_id` 置 null，但本身不删除。

---

## 11. Tauri 命令矩阵

### 11.1 命名约定

- 命令函数名：`snake_case`，与前端 `invoke()` 字符串完全一致。
- 命令参数：`#[derive(Deserialize)]` 单结构体，前端传一个 JSON 对象。
- 命令返回：`Result<T, AppError>`，`T` 必须 `Serialize`。
- 异步命令用 `#[tauri::command] pub async fn ...`，需要 `AppHandle` 的写 `app: AppHandle` 参数。
- 流式命令用 `tauri::ipc::Channel<T>` 参数。

### 11.2 完整命令清单（v1.0）

| 分组      | 命令                          | 输入                                              | 输出                       | Slice |
| --------- | ----------------------------- | ------------------------------------------------- | -------------------------- | ----- |
| resume_io | `load_resume`                 | `{ id: String }`                                  | `Resume`                   | ✅ 已实现 |
| resume_io | `save_resume`                 | `{ resume: Resume }`                              | `()`                        | ✅ 已实现 |
| resume_io | `default_resume_path`         | `()`                                              | `PathBuf`                   | ✅ 已实现 |
| resume_io | `list_resumes`                | `()`                                              | `Vec<ResumeIndexEntry>`     | 6     |
| resume_io | `new_resume`                  | `{ name: String, locale: String }`                | `Resume`                    | 6     |
| resume_io | `duplicate_resume`            | `{ id: String, new_name: String }`                | `Resume`                    | 6     |
| resume_io | `delete_resume`               | `{ id: String }`                                  | `()`                        | 6     |
| resume_io | `import_resume`               | `{ path: PathBuf, format: ImportFormat }`         | `Resume`                    | 6     |
| settings  | `load_settings`               | `{ resume_id: String }`                           | `ResumeSettings`            | 3     |
| settings  | `save_settings`               | `{ settings: ResumeSettings }`                    | `()`                        | 3     |
| settings  | `load_app_settings`           | `()`                                              | `AppSettings`               | 8     |
| settings  | `save_app_settings`           | `{ settings: AppSettings }`                       | `()`                        | 8     |
| render    | `render_html_preview`         | `{ resume: Resume, settings: ResumeSettings }`    | `String`                    | 3     |
| export    | `export_pdf`                  | `{ resume, settings, out_path: PathBuf }`         | `()`                        | 4     |
| export    | `export_html`                 | `{ resume, settings, out_path: PathBuf }`         | `()`                        | 4     |
| export    | `export_markdown`             | `{ resume, settings, out_path: PathBuf }`         | `()`                        | 4     |
| export    | `export_docx`                 | `{ resume, settings, out_path: PathBuf }`         | `()`                        | 4     |
| export    | `export_json`                 | `{ resume, settings, out_path: PathBuf }`         | `()`                        | 6     |
| photo     | `upload_photo`                | `{ resume_id: String, src_path: PathBuf }`        | `String`（相对路径）        | 3     |
| photo     | `delete_photo`                | `{ resume_id: String }`                           | `()`                        | 3     |
| photo     | `get_photo_abs_path`          | `{ resume_id: String }`                           | `PathBuf`                   | 3     |
| template  | `list_templates`              | `()`                                              | `Vec<TemplateMeta>`         | 4     |
| template  | `install_template`            | `{ src_path: PathBuf }`                           | `TemplateMeta`              | 4     |
| ai        | `ai_polish_bullet`            | `{ input: PolishInput, channel: Channel }`        | `()`（流式发到 channel）    | 5     |
| ai        | `ai_rewrite_summary`          | `{ input: RewriteInput, channel: Channel }`       | `()`                        | 5     |
| ai        | `ai_draft_cover_letter`       | `{ input: CoverDraftInput, channel: Channel }`    | `()`                        | 5     |
| ai        | `ai_store_key`                | `{ key: String }`                                 | `()`                        | 5     |
| ai        | `ai_test_key`                 | `()`                                              | `AiKeyStatus`               | 5     |
| ats       | `ats_score`                   | `{ resume: Resume, jd: String }`                  | `AtsReport`                 | 6     |
| ats       | `ats_history`                 | `{ resume_id: String }`                           | `Vec<AtsHistoryEntry>`      | 6     |
| cover     | `load_cover`                  | `{ id: String }`                                  | `CoverLetter`               | 7     |
| cover     | `save_cover`                  | `{ cover: CoverLetter }`                          | `()`                        | 7     |
| cover     | `list_covers`                 | `()`                                              | `Vec<CoverLetterIndexEntry>`| 7     |
| system    | `open_data_dir`               | `()`                                              | `()`                        | 8     |
| system    | `show_in_finder`              | `{ path: PathBuf }`                               | `()`                        | 8     |

### 11.3 注册宏

```rust
// apps/resume-app/src-tauri/src/commands/mod.rs
macro_rules! register_handlers {
    ($builder:expr) => {{
        $builder.invoke_handler(tauri::generate_handler![
            resume_io::load_resume,
            resume_io::save_resume,
            // ... 其余按字母序
        ])
    }};
}
```

加新命令 = 加一个 fn + 在 `tauri::generate_handler!` 列表里加一行。审 PR 时这个文件是唯一的「命令清单」。

### 11.4 异步与并发

- I/O 命令均为 `async fn`，使用 `tokio::task::spawn_blocking` 把 sync 文件操作放到 blocking pool，主线程不阻塞 UI。
- AI 命令：流式 channel + 后台 task；主进程退出时 channel close。
- 并发上限：AI 命令同时最多 3 个；超出排队。
- PDF 导出：单例 webview，加 mutex 序列化。

---

## 12. ts-rs 类型导出

### 12.1 feature 设计

```toml
# resume-core/Cargo.toml
[features]
ts = ["dep:ts-rs"]

[dependencies]
ts-rs = { workspace = true, optional = true }
```

### 12.2 export 目标

所有 model 类型加：

```rust
#[cfg_attr(feature = "ts", derive(TS))]
#[cfg_attr(feature = "ts", ts(export, export_to = "../../../apps/resume-app/src/lib/types/"))]
```

> **路径注意**：base dir 是 `target/`，所以需要 `../../../` 回到 repo root。

### 12.3 流程

1. 改 Rust 模型。
2. `cargo test -p resume-core --features ts`（ts-rs 在 test 阶段触发 export）。
3. 同步类似改 `resume-ats`、`resume-cover`、`resume-templates` 中的暴露给前端的类型。
4. 一并提交。

### 12.4 哪些 crate 开 ts feature

| Crate                  | ts feature | 导出类型                                                              |
| ---------------------- | ---------- | --------------------------------------------------------------------- |
| resume-core            | ✓          | Resume / ResumeMeta / PersonalInfo / Section* / ResumeSettings 等     |
| resume-cover           | ✓          | CoverLetter / CoverBlock 等                                            |
| resume-ats             | ✓          | AtsReport / AtsDimension / AtsSuggestion 等                            |
| resume-templates       | ✓          | TemplateMeta                                                          |
| resume-ai              | ✓          | PolishInput / AiCandidate / AiKeyStatus 等                             |
| resume-render-*        | ✗          | 不暴露内部类型；通过 Tauri 命令包装结果                                |

### 12.5 CI 校验

CI 中跑：

```bash
cargo test --workspace --features ts && git diff --exit-code apps/resume-app/src/lib/types/
```

任何 Rust 改动但忘了同步 TS 类型 → CI 失败。

---

## 13. 错误模型

### 13.1 Core / Library 层（`thiserror`）

```rust
// resume-core/src/error.rs
#[derive(thiserror::Error, Debug)]
pub enum CoreError {
    #[error("IO: {0}")]
    Io(#[from] std::io::Error),
    #[error("JSON: {0}")]
    Json(#[from] serde_json::Error),
    #[error("schema mismatch: expected {expected}, found {found}")]
    SchemaMismatch { expected: String, found: String },
    #[error("path invalid: {0}")]
    Path(String),
}
```

每个 crate 自己的 Error 类型：`HtmlError` / `PdfError` / `AiError` / `AtsError` / `TemplateError`。

### 13.2 应用层 `AppError`（`thiserror` + `serde::Serialize`）

```rust
#[derive(thiserror::Error, Debug, serde::Serialize)]
#[serde(tag = "code", rename_all = "lowercase")]
pub enum AppError {
    Io { message: String },
    Json { message: String },
    Schema { message: String },
    Path { message: String },
    Ai { message: String },
    Ats { message: String },
    Render { message: String },
    Template { message: String },
    Keyring { message: String },
    Network { message: String },
    Internal { message: String },
}
```

每个 `From<CoreError> for AppError` / `From<HtmlError> for AppError` 等 impl 做映射。

### 13.3 错误传播

```rust
#[tauri::command]
pub async fn save_resume(app: AppHandle, resume: Resume) -> Result<(), AppError> {
    let path = paths::resume_path(&app, &resume.meta.id)?;
    io::save_json(&resume, &path).map_err(AppError::from)?;
    Ok(())
}
```

### 13.4 日志

- 用 `tracing` crate + `tracing-subscriber`。
- 默认级别 `info`；用户 Settings 中开启 debug 级别。
- log 文件 `appData/logs/app-YYYY-MM-DD.log`，最多保留 7 天。
- **严禁日志中出现**：完整简历 JSON、AI Key、Personal email/phone 明文（仅记录长度或哈希前 4 位用于排错）。

---

## 14. 性能与并发

### 14.1 关键指标

| 操作                  | 目标         | 实现要点                                          |
| --------------------- | ------------ | ------------------------------------------------- |
| 加载 1 份简历         | ≤ 100 ms     | `spawn_blocking` 异步读取                         |
| 保存 1 份简历         | ≤ 200 ms     | 原子写 + tempfile                                 |
| 渲染 HTML preview     | ≤ 300 ms     | Tera 模板缓存；不每次重新编译模板                 |
| 渲染 PDF（1 页）       | ≤ 3 s        | 复用同一个 offscreen webview，关闭前缓存          |
| ATS 评分              | ≤ 1 s        | 单线程；jieba-rs 一次加载                          |
| AI 单次调用 P95       | ≤ 8 s        | streaming + 客户端超时 60s                        |

### 14.2 缓存

- 模板编译缓存：进程级 `Lazy<Templates>`。
- 字体子集：内置 NotoSansCJK 子集打包进二进制（`include_bytes!`），不每次读盘。
- 简历列表索引：内存 cache + 文件 mtime 校验。

### 14.3 并发约束

| 资源       | 上限                                       |
| ---------- | ------------------------------------------ |
| AI 调用    | 同时 3 个；超出排队                        |
| PDF 渲染   | 单例 webview，全局 mutex                   |
| 保存       | 每份简历内串行；多份简历可并行             |
| ATS 评分   | 单线程同步，无并发约束                     |

---

## 15. 测试策略

### 15.1 单元测试

- 每 section payload：JSON round-trip（serialize → deserialize → 相等）。
- `io::save_json` 原子性：人为 panic 模拟中断，验证旧文件不破坏。
- `AtsScorer`：固定 (resume, jd) 输入，断言评分稳定。

### 15.2 集成测试

- `examples/sample.json` 走 Markdown / HTML renderer 全链路。
- Tauri 命令 unit：用 `tauri::test::mock_app()` mock AppHandle。
- AI client：用 `wiremock` 或自写 mock server，验证 prompt 拼接与 streaming 解析。

### 15.3 端到端（与前端联动）

由前端 spec §19.3 的 Playwright 流程覆盖。

### 15.4 CI

```bash
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
cargo test --workspace --features ts && git diff --exit-code apps/resume-app/src/lib/types/
cargo deny check                          # 许可证 / RUSTSEC 漏洞
```

### 15.5 性能回归

`criterion` benchmark：

- HTML 渲染 1 份完整简历。
- ATS 评分 5K 字简历 + 5K 字 JD。

每次发版前对比基线。

---

## 16. 安全

### 16.1 AI Key

- 仅 `keyring` 存储。
- 不出现在：简历 JSON、settings JSON、log、错误消息、Tauri command 返回值。
- 调试需要时只允许显示后 4 位。

### 16.2 文件路径校验

所有从前端来的 path / id 参数：

- id：必须匹配 `^[a-zA-Z0-9-]+$`，不允许 `.` / `/` / `\`。
- path（导出目标）：必须由 Tauri dialog 返回的路径（前端不能任意构造）。
- 模板 slug：同 id 规则。

### 16.3 模板沙盒

- HTML 渲染前用白名单过滤：禁用 `<script>` / `<iframe>` / `on*` 属性 / 远程 URL。
- CSS 中 `@import` / `url(http...)` 被剥除。
- 用户加载模板时给二次确认对话框：「模板来自外部，是否继续？」

### 16.4 网络出口审计

- 唯一允许的外部域名：`api.anthropic.com`（v1.0）。
- 用 `reqwest` 中间层 / 自定义 connector，遇到其他域名 → reject。
- 日志中记录每次 AI 调用的目标 URL + 状态码（不记录 body）。

### 16.5 依赖审计

- `cargo deny`：拒绝有 RUSTSEC 漏洞与不兼容许可证（GPL 等）的依赖。
- 每次发版前过一次 `cargo audit`。

---

## 17. Roadmap（slice 切分，与前端对齐）

| Slice | 后端范围                                                                                                | 状态     |
| ----- | -------------------------------------------------------------------------------------------------------- | -------- |
| 0     | resume-core + resume-render-markdown                                                                     | ✅ 已完成 |
| 1     | apps/resume-app/src-tauri 应用壳 + load/save/path 三个命令                                                | ✅ 已完成 |
| 2     | resume-core 扩展 15 类 section + ts-rs 同步                                                              | ⏳ 进行中 |
| 3     | resume-render-html + render_html_preview 命令 + ResumeSettings 持久化 + photo upload                    | 📋 计划   |
| 4     | resume-render-pdf（webview 路径）+ resume-render-docx + resume-templates（内置 4 套）+ export 命令矩阵   | 📋 计划   |
| 5     | resume-ai（Anthropic client + 3 能力）+ keyring + 3 个 AI 命令 + 隐私确认                                | 📋 计划   |
| 6     | resume-ats（规则引擎 + jieba）+ ats_score / ats_history                                                  | 📋 计划   |
| 7     | resume-cover + cover 命令 + render-html 复用                                                              | 📋 计划   |
| 8     | 多简历 CRUD（list / new / duplicate / delete）+ import_resume（FlowCV / JSON Resume / LinkedIn）         | 📋 计划   |
| 9     | app_settings 持久化 + 自动保存调度 + 日志 + tracing 集成                                                  | 📋 计划   |
| 10    | 性能优化 + 模板沙盒强化 + cargo deny CI + 打包发布                                                       | 📋 计划   |

---

## 18. 不做的事（明确边界）

- 不引入数据库（SQLite / sled）：v1.0 全 JSON 文件。
- 不做服务器端 / 云同步。
- 不集成 OpenAI / Gemini（v1.0 仅 Anthropic；trait 已抽象，未来可加）。
- 不做简历内嵌字体（embed font 到 PDF）：v1.0 依赖 OS 字体 + NotoSansCJK 子集。
- 不做模板的 hot reload（编辑模板需要重启）。
- 不做 OCR PDF 导入到结构化（v1.0 import 限 JSON 格式）。
- 不做日志远程上报。

---

## 19. 与现有代码的对应关系

| 章节                       | 已实现 | 对应文件                                                       |
| -------------------------- | ------ | -------------------------------------------------------------- |
| §2 workspace               | ⏳ 部分 | `Cargo.toml`、`crates/`                                        |
| §3 数据模型                | ⏳ 部分（4 / 15 section） | `crates/resume-core/src/model/`                |
| §4 io                      | ✅      | `crates/resume-core/src/io.rs`                                  |
| §5 文件系统                | ⏳ 部分 | `apps/resume-app/src-tauri/src/paths.rs`                       |
| §6 Renderer trait          | ✅      | `crates/resume-core/src/render.rs`                              |
| §6.2 markdown              | ✅      | `crates/resume-render-markdown/`                                |
| §6.3 html                  | ❌      | —                                                              |
| §6.4 pdf                   | ❌      | —                                                              |
| §6.5 docx                  | ❌      | —                                                              |
| §7 templates               | ❌      | —                                                              |
| §8 ai                      | ❌      | —                                                              |
| §9 ats                     | ❌      | —                                                              |
| §10 cover                  | ❌      | —                                                              |
| §11 commands               | ⏳ 3 / 30+ | `apps/resume-app/src-tauri/src/commands/`                  |
| §12 ts-rs                  | ✅      | `crates/resume-core/Cargo.toml` 已开 `ts` feature              |
| §13 错误模型               | ⏳ 部分 | `crates/resume-core/src/error.rs`、`src-tauri/src/error.rs`    |

**真理来源声明**：本 spec 的视觉/交互对照以 `docs/prototype/resume-design.pen` 为准，PRD 与本 spec 出现冲突时以 PRD 业务定义优先。
