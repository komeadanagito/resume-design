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
pub struct PersonalInfo {
    pub full_name: String,

    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub title: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub email: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub phone: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub location: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub photo: Option<String>,

    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub extras: Vec<ExtraField>,
}

/// Open key/value field — LinkedIn, Website, Nationality, Visa, etc.
/// `key` is a stable machine identifier; `label` is the display name (can be
/// localized by the caller); `value` is the actual content.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    derive(ts_rs::TS),
    ts(export, export_to = "../../../apps/resume-app/src/lib/types/")
)]
pub struct ExtraField {
    pub key: String,
    pub label: String,
    pub value: String,
}
