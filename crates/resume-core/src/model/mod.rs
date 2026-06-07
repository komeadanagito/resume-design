//! Resume data model. Closed enum over a fixed set of section kinds so every
//! renderer is compiler-forced to handle every variant.

mod education;
mod experience;
mod personal;
mod section;
mod skills;
mod summary;

pub use education::{EducationItem, EducationSection};
pub use experience::{ExperienceItem, ExperienceSection};
pub use personal::{ExtraField, PersonalInfo};
pub use section::{Section, SectionKind};
pub use skills::{SkillGroup, SkillsSection};
pub use summary::SummarySection;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
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
pub struct Resume {
    pub meta: ResumeMeta,
    pub personal: PersonalInfo,
    #[serde(default)]
    pub sections: Vec<Section>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
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
pub struct ResumeMeta {
    pub schema_version: String,
    pub name: String,
    pub locale: String,
}

impl Resume {
    /// Blank resume at the current schema version. Used when the on-disk file
    /// does not yet exist (first launch).
    pub fn blank() -> Self {
        Self {
            meta: ResumeMeta {
                schema_version: crate::SCHEMA_VERSION.to_string(),
                name: "Resume 1".to_string(),
                locale: "zh-CN".to_string(),
            },
            personal: PersonalInfo {
                full_name: String::new(),
                title: None,
                email: None,
                phone: None,
                location: None,
                photo: None,
                extras: Vec::new(),
            },
            sections: Vec::new(),
        }
    }
}
