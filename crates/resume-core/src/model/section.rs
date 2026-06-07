use serde::{Deserialize, Serialize};

use super::{EducationSection, ExperienceSection, SkillsSection, SummarySection};

/// Closed enum of all section kinds.
///
/// JSON shape: `{ "type": "experience", ...payload }` — the `type` discriminator
/// is stable across versions and the rest of the object is the variant payload
/// flattened in. Adding a new variant is a deliberate breaking decision that
/// the compiler flags in every renderer's `match`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
#[cfg_attr(
    feature = "ts",
    derive(ts_rs::TS),
    ts(
        export,
        export_to = "../../../apps/resume-app/src/lib/types/",
        tag = "type",
        rename_all = "camelCase"
    )
)]
pub enum Section {
    Summary(SummarySection),
    Experience(ExperienceSection),
    Education(EducationSection),
    Skills(SkillsSection),
}

/// Lightweight tag enum for menus, filters, ordering — anywhere code needs to
/// talk about *which kind of section* without carrying the payload.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(
    feature = "ts",
    derive(ts_rs::TS),
    ts(
        export,
        export_to = "../../../apps/resume-app/src/lib/types/",
        rename_all = "camelCase"
    )
)]
pub enum SectionKind {
    Summary,
    Experience,
    Education,
    Skills,
}

impl Section {
    pub fn kind(&self) -> SectionKind {
        match self {
            Section::Summary(_) => SectionKind::Summary,
            Section::Experience(_) => SectionKind::Experience,
            Section::Education(_) => SectionKind::Education,
            Section::Skills(_) => SectionKind::Skills,
        }
    }
}

impl SectionKind {
    /// Stable display name. Renderers may override; UIs can use this as a default.
    pub fn default_title(&self) -> &'static str {
        match self {
            SectionKind::Summary => "Summary",
            SectionKind::Experience => "Experience",
            SectionKind::Education => "Education",
            SectionKind::Skills => "Skills",
        }
    }
}
