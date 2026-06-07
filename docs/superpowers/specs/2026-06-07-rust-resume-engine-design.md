# Rust Resume Engine — Design (Phase 1)

Date: 2026-06-07
Status: Implemented (Phase 1)
Prototype: `docs/prototype/pencil-new.pen`

## Goal

A Rust resume **engine / library** (not a web app, not a desktop GUI in this phase). Provide a typed core data model, JSON persistence, and a renderer trait — verified by a Markdown reference renderer. Future phases attach additional renderers (HTML, PDF) and frontends (CLI, GUI) without core changes.

## Non-goals (Phase 1)

- No GUI, no CLI binary.
- No PDF / HTML renderer.
- No i18n machinery beyond carrying `locale` on `ResumeMeta`.
- No schema migration. Wrong `schema_version` returns an error.
- No date parsing — dates stored as `Option<String>` to preserve "Present" / mixed locale text.
- No theming, fonts, colors. That's renderer concern.

## Architecture

Cargo workspace at repo root, two crates in Phase 1:

```
resume-design/                  (existing repo root)
├── Cargo.toml                  [workspace]
├── crates/
│   ├── resume-core/            data model + io + Renderer trait
│   └── resume-render-markdown/ Markdown impl of Renderer
└── examples/sample.json        fixture for tests & demos
```

`resume-core` has no renderer dependencies. Renderer crates depend on `resume-core`. One-way fanout. Future `resume-render-html`, `resume-render-pdf`, `resume-cli`, `resume-gui` are new crates, not modifications.

## Core Data Model

```rust
pub struct Resume {
    pub meta: ResumeMeta,
    pub personal: PersonalInfo,
    pub sections: Vec<Section>,  // ordered; renderer follows this order
}

pub struct ResumeMeta {
    pub schema_version: String,  // "0.1.0"
    pub name: String,            // e.g. "Resume 1"
    pub locale: String,          // e.g. "zh-CN" / "en-US"
}

pub struct PersonalInfo {
    pub full_name: String,
    pub title: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub location: Option<String>,
    pub photo: Option<String>,
    pub extras: Vec<ExtraField>,   // LinkedIn, Website, Nationality, ...
}

pub struct ExtraField { pub key: String, pub label: String, pub value: String }

pub enum Section {
    Summary(SummarySection),
    Experience(ExperienceSection),
    Education(EducationSection),
    Skills(SkillsSection),
}

pub enum SectionKind { Summary, Experience, Education, Skills }
impl Section { pub fn kind(&self) -> SectionKind; }
```

Section payload types:

- `SummarySection { content: String }`
- `ExperienceSection { items: Vec<ExperienceItem> }` where
  `ExperienceItem { company, role, start, end, location, bullets: Vec<String> }`
- `EducationSection { items: Vec<EducationItem> }` where
  `EducationItem { school, degree, field, start, end, honors: Vec<String> }`
- `SkillsSection { groups: Vec<SkillGroup> }` where
  `SkillGroup { name, items: Vec<String> }`

Optional text fields are `Option<String>` so JSON stays minimal (`skip_serializing_if`).

### Why enum, not `Box<dyn Section>`

Closed enum gives exhaustive `match` so every renderer is compiler-forced to handle every section kind. Adding a new section means one variant + one file — a deliberate central point that flags downstream work. Trait objects would defer this discipline and add runtime cost for zero gain at this scale.

## Serialization (`io.rs`)

```rust
pub fn load_json(path: &Path) -> Result<Resume, CoreError>;
pub fn save_json(resume: &Resume, path: &Path) -> Result<(), CoreError>;
pub fn from_json_str(s: &str) -> Result<Resume, CoreError>;
pub fn to_json_string(resume: &Resume) -> Result<String, CoreError>;
```

- `serde` + `serde_json` with `#[serde(rename_all = "camelCase")]`.
- `save_json` writes via `tempfile::NamedTempFile` in the target directory, then `persist`. Atomic-rename semantics; partial writes never replace a good resume file.
- `save_json` calls `fs::create_dir_all` on the parent — saving into a fresh path works without ceremony.
- `Section` enum serializes with `#[serde(tag = "type")]` so JSON shape is `{ "type": "experience", "items": [...] }`. Stable for future frontends.

## Renderer trait (`render.rs`)

```rust
pub trait Renderer {
    type Output;
    type Error: std::error::Error + 'static;
    fn render(&self, resume: &Resume) -> Result<Self::Output, Self::Error>;
}
```

Associated types so each renderer picks its natural return shape:
- Markdown / HTML → `String`
- PDF → `Vec<u8>`
- Future GUI preview → custom display tree

`Error` is associated too — PDF font-load failures should not pollute the Markdown signature, which is infallible.

## Error model (`error.rs`)

```rust
#[derive(thiserror::Error, Debug)]
pub enum CoreError {
    #[error("IO error: {0}")] Io(#[from] std::io::Error),
    #[error("JSON parse: {0}")] Json(#[from] serde_json::Error),
    #[error("schema version {found} not supported (expected {expected})")]
    UnsupportedSchema { found: String, expected: String },
}
```

Library style: `thiserror`, no `anyhow`. Caller chooses how to wrap.

## Markdown renderer

```rust
pub struct MarkdownRenderer { pub options: MarkdownOptions }
pub struct MarkdownOptions {
    pub heading_level_offset: u8,   // default 0; bump to nest into a doc
    pub include_contact_line: bool, // default true
}
impl Default for MarkdownOptions { ... }

impl Renderer for MarkdownRenderer {
    type Output = String;
    type Error = std::convert::Infallible;
    fn render(&self, resume: &Resume) -> Result<String, Self::Error>;
}
```

Output shape (sketch):

```
# Full Name
**Title** · email · phone · location

## Summary
...

## Experience
### Role @ Company  (2023.01 – Present)  — Location
- bullet

## Education
### Degree, Field — School  (2019 – 2023)
- honor

## Skills
**Group**: a, b, c
```

Per `SectionKind` `match`. Adding a 5th section type makes this match non-exhaustive — compiler error is the spec.

## Testing

- `resume-core`:
  - Unit: JSON round-trip for `Resume` with all 4 section kinds.
  - Unit: `from_json_str` rejects unknown `schema_version`.
  - Unit: `save_json` then `load_json` via `tempfile::tempdir()` recovers identical data.
- `resume-render-markdown`:
  - Unit: render a fixture resume → output contains expected headings, role lines, bullets.
  - Unit: empty `sections` renders just personal block, no crash.
- Workspace `cargo test` is the gate.

## Extensibility recipes

- **New section type** (e.g. `Languages`): add `LanguagesSection` struct, add `Section::Languages(...)` variant + matching `SectionKind`. Compiler flags every renderer.
- **New renderer**: `cargo new --lib crates/resume-render-html`, depend on `resume-core`, `impl Renderer for HtmlRenderer`.
- **New frontend**: `cargo new crates/resume-cli`, depend on `resume-core` + chosen renderer(s).

## Out of scope (deferred to later phases)

- 11 more section types (Languages, Certificates, Interests, Projects, Courses, Awards, Organizations, Publications, References, Declaration, Custom).
- HTML / PDF renderers.
- CLI binary.
- GUI — framework choice (egui / iced / slint) deferred until first GUI phase begins.
- Schema migrations.
- i18n (per-field bilingual content).

## Phase 1 verification

- `cargo test --workspace` → 18 passed (8 in `resume-core`, 10 in `resume-render-markdown`).
- `cargo clippy --workspace --all-targets -- -D warnings` → clean.
- `cargo fmt --all --check` → clean.
- End-to-end smoke: `cargo run -p resume-render-markdown --example render_sample` loads `examples/sample.json` and prints Markdown.
