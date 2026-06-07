//! resume-core
//!
//! Typed core data model, JSON persistence, and a `Renderer` trait for the
//! resume engine. Renderers (Markdown, HTML, PDF) and frontends (CLI, GUI)
//! live in sibling crates and depend on this one — never the other way.

pub mod error;
pub mod io;
pub mod model;
pub mod render;

pub use error::CoreError;
pub use model::{
    EducationItem, EducationSection, ExperienceItem, ExperienceSection, ExtraField, PersonalInfo,
    Resume, ResumeMeta, Section, SectionKind, SkillGroup, SkillsSection, SummarySection,
};
pub use render::Renderer;

/// Schema version this crate writes. `load_json` rejects anything else for now.
pub const SCHEMA_VERSION: &str = "0.1.0";
