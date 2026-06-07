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
pub struct EducationSection {
    #[serde(default)]
    pub items: Vec<EducationItem>,
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
pub struct EducationItem {
    pub school: String,

    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub degree: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub field: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub start: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub end: Option<String>,

    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub honors: Vec<String>,
}
