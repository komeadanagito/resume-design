use resume_core::{
    io, EducationItem, EducationSection, ExperienceItem, ExperienceSection, ExtraField,
    PersonalInfo, Resume, ResumeMeta, Section, SectionKind, SkillGroup, SkillsSection,
    SummarySection, SCHEMA_VERSION,
};

fn sample_resume() -> Resume {
    Resume {
        meta: ResumeMeta {
            schema_version: SCHEMA_VERSION.to_string(),
            name: "Resume 1".into(),
            locale: "zh-CN".into(),
        },
        personal: PersonalInfo {
            full_name: "Ada Lovelace".into(),
            title: Some("Analytical Engine Engineer".into()),
            email: Some("ada@example.com".into()),
            phone: Some("+86 138-0000-0000".into()),
            location: Some("London, UK".into()),
            photo: None,
            extras: vec![ExtraField {
                key: "linkedin".into(),
                label: "LinkedIn".into(),
                value: "linkedin.com/in/ada".into(),
            }],
        },
        sections: vec![
            Section::Summary(SummarySection {
                content: "First computer programmer.".into(),
            }),
            Section::Experience(ExperienceSection {
                items: vec![ExperienceItem {
                    company: "Babbage Lab".into(),
                    role: "Engineer".into(),
                    start: Some("1842".into()),
                    end: Some("Present".into()),
                    location: Some("London".into()),
                    bullets: vec![
                        "Wrote the first algorithm".into(),
                        "Documented the engine".into(),
                    ],
                }],
            }),
            Section::Education(EducationSection {
                items: vec![EducationItem {
                    school: "Private tutoring".into(),
                    degree: None,
                    field: Some("Mathematics".into()),
                    start: Some("1828".into()),
                    end: Some("1835".into()),
                    honors: vec![],
                }],
            }),
            Section::Skills(SkillsSection {
                groups: vec![SkillGroup {
                    name: "Languages".into(),
                    items: vec!["English".into(), "French".into()],
                }],
            }),
        ],
    }
}

#[test]
fn json_round_trip_preserves_data() {
    let original = sample_resume();
    let json = io::to_json_string(&original).expect("serialize");
    let restored = io::from_json_str(&json).expect("deserialize");
    assert_eq!(original, restored);
}

#[test]
fn file_round_trip_preserves_data() {
    let dir = tempfile::tempdir().expect("tempdir");
    let path = dir.path().join("resume.json");
    let original = sample_resume();

    io::save_json(&original, &path).expect("save");
    let restored = io::load_json(&path).expect("load");
    assert_eq!(original, restored);
}

#[test]
fn save_into_missing_subdirectory_creates_it() {
    let dir = tempfile::tempdir().expect("tempdir");
    let path = dir.path().join("nested/dir/resume.json");
    let original = sample_resume();

    io::save_json(&original, &path).expect("save creates dirs");
    assert!(path.exists());
}

#[test]
fn unsupported_schema_is_rejected() {
    let mut resume = sample_resume();
    resume.meta.schema_version = "99.0.0".into();
    let json = serde_json::to_string(&resume).expect("serialize");

    let err = io::from_json_str(&json).expect_err("should reject");
    let msg = err.to_string();
    assert!(
        msg.contains("99.0.0"),
        "error mentions found version: {msg}"
    );
    assert!(
        msg.contains(SCHEMA_VERSION),
        "error mentions expected: {msg}"
    );
}

#[test]
fn section_kind_returns_correct_tag() {
    let r = sample_resume();
    let kinds: Vec<SectionKind> = r.sections.iter().map(Section::kind).collect();
    assert_eq!(
        kinds,
        vec![
            SectionKind::Summary,
            SectionKind::Experience,
            SectionKind::Education,
            SectionKind::Skills,
        ]
    );
}

#[test]
fn json_uses_camel_case_for_full_name() {
    let resume = sample_resume();
    let json = io::to_json_string(&resume).expect("serialize");
    assert!(json.contains("\"fullName\""), "JSON contains camelCase key");
    assert!(!json.contains("\"full_name\""), "no snake_case leaks");
}

#[test]
fn json_omits_none_optional_fields() {
    let resume = sample_resume();
    let json = io::to_json_string(&resume).expect("serialize");
    assert!(!json.contains("\"photo\""), "photo:None is skipped: {json}");
}

#[test]
fn section_json_uses_type_discriminator() {
    let resume = sample_resume();
    let json = io::to_json_string(&resume).expect("serialize");
    assert!(
        json.contains("\"type\": \"summary\""),
        "tag=type, camelCase: {json}"
    );
    assert!(json.contains("\"type\": \"experience\""));
}
