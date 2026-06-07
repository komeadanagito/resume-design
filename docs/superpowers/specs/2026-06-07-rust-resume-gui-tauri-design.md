# Resume GUI (Tauri + React) — Design (Phase 2, slice 1)

Date: 2026-06-07
Status: Implemented (Phase 2 slice 1)
Prototype: `docs/prototype/pencil-new.pen`
Builds on: `2026-06-07-rust-resume-engine-design.md`

## Goal

Stand up the first end-to-end Tauri + React slice on top of `resume-core`:
- A real desktop app that launches, loads/saves a resume JSON, and lets the user edit the Personal Details panel.
- Foundations sized so adding the next 14 sections and 2 screens later is "add a file" rather than "rewrite the shell".

The overriding requirement is **extensibility** — first slice does not implement most features; it has to make the rest cheap.

## Non-goals (this slice)

- No editing of any section (Experience/Education/Skills) yet.
- No Add Content modal (just a stub button).
- No right-side live preview.
- No PDF/HTML export.
- No bilingual i18n machinery (labels are hard-coded `"EN 中文"` strings).
- No authentication, cloud sync, multi-document tabs.

## Architecture overview

```
resume-design/                            (existing repo)
├── Cargo.toml                            workspace; add new member
├── crates/
│   ├── resume-core/                      existing
│   └── resume-render-markdown/           existing
└── apps/
    └── resume-app/                       NEW
        ├── package.json
        ├── vite.config.ts
        ├── tailwind.config.ts
        ├── postcss.config.js
        ├── tsconfig.json
        ├── index.html
        ├── src/                          React frontend
        │   ├── main.tsx
        │   ├── App.tsx                   LocaleProvider + ResumeProvider + EditorPage
        │   ├── styles.css                Tailwind directives
        │   ├── lib/
        │   │   ├── tauri.ts              Thin wrappers around invoke()
        │   │   ├── resume-context.tsx    Context + reducer
        │   │   ├── section-registry.ts   Extension point for section kinds (titleKey-based)
        │   │   ├── i18n/                 LocaleProvider + zh/en dicts + useT()
        │   │   └── types/                ts-rs generated (committed)
        │   ├── pages/
        │   │   └── EditorPage.tsx        App shell + AddContentModal toggle
        │   └── components/
        │       ├── TopNav.tsx
        │       ├── Modal.tsx             Generic centered modal (portal + backdrop + Esc)
        │       ├── AddContentModal.tsx   Title + close + empty body (cards: later)
        │       ├── personal/
        │       │   ├── PersonalSection.tsx     orchestrator (collapsed ↔ expanded)
        │       │   ├── PersonalCollapsed.tsx   read-only card
        │       │   └── PersonalEditPanel.tsx   inline edit form (replaces card in place)
        │       └── form/                 Field/Input/Button atoms
        └── src-tauri/                    Rust backend (new workspace member)
            ├── Cargo.toml
            ├── tauri.conf.json
            ├── build.rs
            └── src/
                ├── main.rs
                ├── error.rs              AppError (Serialize)
                ├── paths.rs              default resume.json path
                └── commands/
                    ├── mod.rs
                    ├── resume_io.rs      load_resume / save_resume
                    └── app_paths.rs      default_resume_path
```

`apps/` is for binaries / deliverables; `crates/` is for reusable libraries. Future `apps/resume-cli` follows the same pattern.

## Tauri command surface

Three commands, registered in a single `register_handlers` macro. New commands are added by creating a file under `commands/` and appending one line.

```rust
#[tauri::command]
pub async fn load_resume(path: Option<PathBuf>) -> Result<Resume, AppError>;

#[tauri::command]
pub async fn save_resume(resume: Resume, path: Option<PathBuf>) -> Result<(), AppError>;

#[tauri::command]
pub fn default_resume_path() -> Result<PathBuf, AppError>;
```

- `path: None` falls back to `tauri::api::path::app_data_dir() + "/resume.json"`.
- `load_resume` returns a blank Resume (with `SCHEMA_VERSION`, empty sections, empty personal) when the file does not exist — first launch is not an error.
- `AppError` is `#[derive(thiserror::Error, serde::Serialize)]` with a `code` discriminant (`"io" | "json" | "schema" | "path"`) and a human `message`.

## Frontend stack

| Concern | Choice | Why |
|---|---|---|
| Framework | React 18 + TS | Tauri default |
| Build | Vite | Tauri default |
| Routing | None (single-page) | Personal edit expands in place; modal lives inside EditorPage. Router can be added back when a real second top-level page lands. |
| Styling | Tailwind 3 | Match prototype quickly; token-driven design system |
| Forms | `react-hook-form` + `zod` | One declaration per field; resolver runs zod schema |
| Icons | `lucide-react` | Matches prototype icon style |
| Global state | `useReducer` + `createContext` | One place to extend; no extra dep |
| i18n | Custom `LocaleProvider` + zh/en dicts + `useT()` | Strings live in `src/lib/i18n/{zh,en}.ts`. Default locale `zh`. Locale switcher UI deferred to a later slice but the foundation is wired. |

## Type sync — `ts-rs`

`resume-core` gets an optional `ts` feature that derives `ts_rs::TS` on all model types and exports to `apps/resume-app/src/lib/types/`. Generated `.ts` files are **committed to git** so the frontend builds cold without first running cargo.

Workflow:
1. Edit Rust struct.
2. Run `cargo test -p resume-core --features ts`.
3. Generated TS updates; commit alongside Rust change.

Adding a new section kind requires no manual TS authoring.

## Section registry (extension point)

```ts
// src/lib/section-registry.ts
import type { SectionKind } from "./types/SectionKind";

export type SectionDef = {
  kind: SectionKind;
  title: string;                                      // "Experience 经验"
  icon: LucideIcon;
  formComponent?: React.FC<SectionFormProps<any>>;    // edit panel
  previewComponent?: React.FC<SectionPreviewProps<any>>;  // card on EditorPage
};

export const SECTION_REGISTRY: Partial<Record<SectionKind, SectionDef>> = {
  summary:    { kind: "summary",    title: "Summary 概述",     icon: AlignLeft },
  experience: { kind: "experience", title: "Experience 经验",  icon: Briefcase },
  education:  { kind: "education",  title: "Education 教育",   icon: GraduationCap },
  skills:     { kind: "skills",     title: "Skills 技能",      icon: Sparkles },
};
```

Phase-1 components are intentionally undefined — the Add Content modal and main editor render whatever's in the registry. Adding `LanguagesSection`:
1. Rust: new variant + new struct file.
2. `cargo test --features ts` regenerates types.
3. Frontend: import the new type, add a registry entry, write the two components.
4. Nothing else changes.

## Resume context + reducer

```ts
type ResumeAction =
  | { kind: "load"; resume: Resume }
  | { kind: "setPersonal"; personal: PersonalInfo }
  | { kind: "addSection"; section: Section }
  | { kind: "removeSection"; index: number }
  | { kind: "reorderSections"; from: number; to: number }
  | { kind: "updateSection"; index: number; section: Section };

function resumeReducer(state: Resume, action: ResumeAction): Resume;
```

Each editor form mutates locally via `react-hook-form`, then dispatches **one** action on Submit. No per-keystroke IPC. Save to disk is explicit (a button in the form footer).

## Styling tokens

Tokens sampled directly from the prototype `.pen` file:

```ts
// tailwind.config.ts excerpt
colors: {
  brand:   { 50: "#EBF3FF", 500: "#0066FF", 600: "#0052D6" },
  ink:     { 900: "#1D102C", 700: "#5C5564", 500: "#8B8297", 300: "#A29BAB" },
  surface: { DEFAULT: "#F5F7FA", card: "#FFFFFF", muted: "#F8F6F3", tag: "#F0ECE7" },
},
borderRadius: { card: "24px", button: "16px", pill: "999px" },
boxShadow:    { card: "0 4px 16px rgba(29,16,44,0.06)" },
fontFamily:   { sans: ["Inter", "PingFang SC", "system-ui"] },
```

Components reference tokens (`bg-brand-500`, `shadow-card`). Theme changes are config-only.

## Testing

- **Rust**: `commands/resume_io.rs` round-trip test using `tempfile::tempdir()` and a constructed `PathBuf` (skip Tauri runtime — commands are plain async fns).
- **Frontend**: `vitest` covers (1) `resumeReducer` action coverage, (2) zod schema validation on the personal-details form.
- **Manual**: `pnpm tauri dev` → app launches → edit name → Done → reopen → name persists.

## Phase-2 verification gate

- `cargo check --workspace` clean. ✅
- `cargo test --workspace` → 19 passed (8 core + 10 markdown + 1 tauri). ✅
- `cargo test -p resume-core --features ts` regenerates 13 `.ts` files under `apps/resume-app/src/lib/types/`. ✅
- `cargo clippy --workspace --all-targets -- -D warnings` clean. ✅
- `cargo fmt --all --check` clean. ✅
- `cd apps/resume-app && pnpm install && ./node_modules/.bin/tsc -b --noEmit && ./node_modules/.bin/vite build` succeeds (262 KB JS / 11 KB CSS gzipped to 81 KB / 3 KB). ✅

## Running the app

```bash
# one-time
cd apps/resume-app && pnpm install

# dev (opens the Tauri desktop window with HMR)
pnpm tauri:dev

# production bundle (.app / .dmg / .exe / .deb depending on host)
pnpm tauri:build
```

The first launch creates `resume.json` at the platform default
(`~/Library/Application Support/design.resume.app/resume.json` on macOS).

## Out of scope (later phases)

- Add Content modal flow.
- Section editing (Experience, Education, Skills).
- Right-side preview (HTML or canvas).
- PDF export.
- Real i18n.
- Multi-document workspace.
- Photo upload / crop.
- Window state persistence.
