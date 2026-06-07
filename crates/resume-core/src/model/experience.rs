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
pub struct ExperienceSection {
    #[serde(default)]
    pub items: Vec<ExperienceItem>,
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
pub struct ExperienceItem {
    pub company: String,
    pub role: String,

    /// Free-form date string ("2023.01", "Jan 2023", "2023 年 1 月"). The model
    /// preserves whatever the user typed; structured parsing is a renderer or
    /// later-phase concern.
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub start: Option<String>,

    /// `None` or "Present" both mean "still in role"; renderers decide display.
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub end: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub location: Option<String>,

    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub bullets: Vec<String>,
}
