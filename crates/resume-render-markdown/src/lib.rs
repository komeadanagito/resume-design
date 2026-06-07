//! Markdown renderer for the resume engine.
//!
//! Implements [`resume_core::Renderer`] with `Output = String` and
//! `Error = Infallible`. Output shape (with default options):
//!
//! ```text
//! # Full Name
//! **Title** · email · phone · location · LinkedIn: linkedin.com/in/ada
//!
//! ## Summary
//! ...
//!
//! ## Experience
//! ### Role @ Company  (Start – End) — Location
//! - bullet
//!
//! ## Education
//! ### School — Degree, Field  (Start – End)
//! - honor
//!
//! ## Skills
//! **Group**: a, b, c
//! ```

use std::convert::Infallible;
use std::fmt::Write;

use resume_core::{
    EducationItem, ExperienceItem, PersonalInfo, Renderer, Resume, Section, SkillGroup,
};

pub struct MarkdownRenderer {
    pub options: MarkdownOptions,
}

#[derive(Debug, Clone)]
pub struct MarkdownOptions {
    /// Added to every heading level. `0` → name is `#`; `1` → name is `##`.
    /// Useful when embedding rendered output inside a larger document.
    pub heading_level_offset: u8,
    /// When `true`, emits a single contact line under the name.
    pub include_contact_line: bool,
}

impl Default for MarkdownOptions {
    fn default() -> Self {
        Self {
            heading_level_offset: 0,
            include_contact_line: true,
        }
    }
}

impl MarkdownRenderer {
    pub fn new() -> Self {
        Self {
            options: MarkdownOptions::default(),
        }
    }

    pub fn with_options(options: MarkdownOptions) -> Self {
        Self { options }
    }

    fn heading(&self, base: u8) -> String {
        let level = (base as usize + self.options.heading_level_offset as usize).min(6);
        "#".repeat(level.max(1))
    }
}

impl Default for MarkdownRenderer {
    fn default() -> Self {
        Self::new()
    }
}

impl Renderer for MarkdownRenderer {
    type Output = String;
    type Error = Infallible;

    fn render(&self, resume: &Resume) -> Result<Self::Output, Self::Error> {
        let mut buf = String::new();
        write_personal(&mut buf, &resume.personal, self);
        for section in &resume.sections {
            buf.push('\n');
            match section {
                Section::Summary(s) => {
                    write_section_heading(&mut buf, self, "Summary");
                    writeln!(buf, "{}", s.content).unwrap();
                }
                Section::Experience(s) => {
                    write_section_heading(&mut buf, self, "Experience");
                    write_blocks(&mut buf, &s.items, |buf, item| {
                        write_experience_item(buf, self, item)
                    });
                }
                Section::Education(s) => {
                    write_section_heading(&mut buf, self, "Education");
                    write_blocks(&mut buf, &s.items, |buf, item| {
                        write_education_item(buf, self, item)
                    });
                }
                Section::Skills(s) => {
                    write_section_heading(&mut buf, self, "Skills");
                    write_blocks(&mut buf, &s.groups, write_skill_group);
                }
            }
        }
        Ok(buf)
    }
}

fn write_personal(buf: &mut String, p: &PersonalInfo, r: &MarkdownRenderer) {
    writeln!(buf, "{} {}", r.heading(1), p.full_name).unwrap();
    if !r.options.include_contact_line {
        return;
    }
    let mut parts: Vec<String> = Vec::new();
    if let Some(t) = &p.title {
        parts.push(format!("**{t}**"));
    }
    for opt in [&p.email, &p.phone, &p.location].into_iter().flatten() {
        parts.push(opt.clone());
    }
    for extra in &p.extras {
        parts.push(format!("{}: {}", extra.label, extra.value));
    }
    if !parts.is_empty() {
        writeln!(buf, "{}", parts.join(" · ")).unwrap();
    }
}

fn write_section_heading(buf: &mut String, r: &MarkdownRenderer, title: &str) {
    writeln!(buf, "{} {}", r.heading(2), title).unwrap();
}

fn write_experience_item(buf: &mut String, r: &MarkdownRenderer, item: &ExperienceItem) {
    let mut head = format!("{} {} @ {}", r.heading(3), item.role, item.company);
    if let Some(range) = format_date_range(item.start.as_deref(), item.end.as_deref()) {
        head.push_str(&format!("  ({range})"));
    }
    if let Some(loc) = &item.location {
        head.push_str(&format!(" — {loc}"));
    }
    writeln!(buf, "{head}").unwrap();
    for bullet in &item.bullets {
        writeln!(buf, "- {bullet}").unwrap();
    }
}

fn write_education_item(buf: &mut String, r: &MarkdownRenderer, item: &EducationItem) {
    let mut head = format!("{} {}", r.heading(3), item.school);
    let degree_field = match (&item.degree, &item.field) {
        (Some(d), Some(f)) => Some(format!("{d}, {f}")),
        (Some(d), None) => Some(d.clone()),
        (None, Some(f)) => Some(f.clone()),
        (None, None) => None,
    };
    if let Some(df) = degree_field {
        head.push_str(&format!(" — {df}"));
    }
    if let Some(range) = format_date_range(item.start.as_deref(), item.end.as_deref()) {
        head.push_str(&format!("  ({range})"));
    }
    writeln!(buf, "{head}").unwrap();
    for honor in &item.honors {
        writeln!(buf, "- {honor}").unwrap();
    }
}

fn write_skill_group(buf: &mut String, group: &SkillGroup) {
    writeln!(buf, "**{}**: {}", group.name, group.items.join(", ")).unwrap();
}

/// Writes a sequence of independent blocks separated by a blank line.
/// Avoids consecutive paragraph lines being collapsed by CommonMark parsers.
fn write_blocks<T, F>(buf: &mut String, items: &[T], mut writer: F)
where
    F: FnMut(&mut String, &T),
{
    for (i, item) in items.iter().enumerate() {
        if i > 0 {
            buf.push('\n');
        }
        writer(buf, item);
    }
}

fn format_date_range(start: Option<&str>, end: Option<&str>) -> Option<String> {
    match (start, end) {
        (Some(s), Some(e)) => Some(format!("{s} – {e}")),
        (Some(s), None) => Some(s.to_string()),
        (None, Some(e)) => Some(e.to_string()),
        (None, None) => None,
    }
}
