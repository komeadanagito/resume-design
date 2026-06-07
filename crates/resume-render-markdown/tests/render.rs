use resume_core::{
    EducationItem, EducationSection, ExperienceItem, ExperienceSection, ExtraField, PersonalInfo,
    Renderer, Resume, ResumeMeta, Section, SkillGroup, SkillsSection, SummarySection,
    SCHEMA_VERSION,
};
use resume_render_markdown::{MarkdownOptions, MarkdownRenderer};

fn sample() -> Resume {
    Resume {
        meta: ResumeMeta {
            schema_version: SCHEMA_VERSION.into(),
            name: "Resume 1".into(),
            locale: "en-US".into(),
        },
        personal: PersonalInfo {
            full_name: "Ada Lovelace".into(),
            title: Some("Engineer".into()),
            email: Some("ada@example.com".into()),
            phone: Some("+1 555 0100".into()),
            location: Some("London".into()),
            photo: None,
            extras: vec![ExtraField {
                key: "linkedin".into(),
                label: "LinkedIn".into(),
                value: "linkedin.com/in/ada".into(),
            }],
        },
        sections: vec![
            Section::Summary(SummarySection {
                content: "First programmer.".into(),
            }),
            Section::Experience(ExperienceSection {
                items: vec![ExperienceItem {
                    company: "Babbage Lab".into(),
                    role: "Engineer".into(),
                    start: Some("1842".into()),
                    end: Some("Present".into()),
                    location: Some("London".into()),
                    bullets: vec!["Wrote first algorithm".into()],
                }],
            }),
            Section::Education(EducationSection {
                items: vec![EducationItem {
                    school: "Private tutoring".into(),
                    degree: None,
                    field: Some("Mathematics".into()),
                    start: Some("1828".into()),
                    end: Some("1835".into()),
                    honors: vec!["With distinction".into()],
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
fn renders_name_as_h1() {
    let out = MarkdownRenderer::new().render(&sample()).unwrap();
    assert!(
        out.starts_with("# Ada Lovelace\n"),
        "starts with H1 name: {out}"
    );
}

#[test]
fn renders_contact_line_with_separators() {
    let out = MarkdownRenderer::new().render(&sample()).unwrap();
    assert!(out.contains("**Engineer**"), "title bold: {out}");
    assert!(out.contains("ada@example.com"));
    assert!(out.contains("+1 555 0100"));
    assert!(out.contains("London"));
    assert!(out.contains(" · "), "uses middle-dot separator");
}

#[test]
fn renders_extras_in_contact_block() {
    let out = MarkdownRenderer::new().render(&sample()).unwrap();
    assert!(out.contains("linkedin.com/in/ada"));
}

#[test]
fn renders_section_headings_in_order() {
    let out = MarkdownRenderer::new().render(&sample()).unwrap();
    let summary_pos = out.find("## Summary").expect("summary heading");
    let exp_pos = out.find("## Experience").expect("experience heading");
    let edu_pos = out.find("## Education").expect("education heading");
    let skills_pos = out.find("## Skills").expect("skills heading");
    assert!(summary_pos < exp_pos);
    assert!(exp_pos < edu_pos);
    assert!(edu_pos < skills_pos);
}

#[test]
fn renders_experience_role_and_company() {
    let out = MarkdownRenderer::new().render(&sample()).unwrap();
    assert!(
        out.contains("### Engineer @ Babbage Lab"),
        "role @ company H3: {out}"
    );
    assert!(out.contains("1842 – Present"), "date range: {out}");
    assert!(out.contains("London"));
    assert!(out.contains("- Wrote first algorithm"));
}

#[test]
fn renders_education_with_degree_optional() {
    let out = MarkdownRenderer::new().render(&sample()).unwrap();
    assert!(out.contains("### Private tutoring"));
    assert!(out.contains("Mathematics"));
    assert!(out.contains("1828 – 1835"));
    assert!(out.contains("- With distinction"));
}

#[test]
fn renders_skills_grouped() {
    let out = MarkdownRenderer::new().render(&sample()).unwrap();
    assert!(
        out.contains("**Languages**: English, French"),
        "skill group line: {out}"
    );
}

#[test]
fn empty_sections_renders_personal_block_only() {
    let mut r = sample();
    r.sections.clear();
    let out = MarkdownRenderer::new().render(&r).unwrap();
    assert!(out.starts_with("# Ada Lovelace"));
    assert!(!out.contains("## Summary"));
    assert!(!out.contains("## Experience"));
}

#[test]
fn heading_level_offset_demotes_headings() {
    let r = sample();
    let out = MarkdownRenderer::with_options(MarkdownOptions {
        heading_level_offset: 1,
        ..MarkdownOptions::default()
    })
    .render(&r)
    .unwrap();
    assert!(out.starts_with("## Ada Lovelace"), "name becomes H2: {out}");
    assert!(out.contains("### Summary"), "section heading becomes H3");
    assert!(
        out.contains("#### Engineer @ Babbage Lab"),
        "item heading H4"
    );
}

#[test]
fn include_contact_line_false_omits_line() {
    let r = sample();
    let out = MarkdownRenderer::with_options(MarkdownOptions {
        include_contact_line: false,
        ..MarkdownOptions::default()
    })
    .render(&r)
    .unwrap();
    assert!(!out.contains("ada@example.com"));
    assert!(!out.contains("**Engineer**"));
    assert!(!out.contains("linkedin.com/in/ada"));
}
