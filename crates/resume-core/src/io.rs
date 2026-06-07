//! JSON I/O for [`Resume`].
//!
//! `save_json` writes via a temp file in the target directory and renames it
//! into place — partial writes never replace a good resume file.

use std::fs;
use std::io::Write;
use std::path::Path;

use tempfile::NamedTempFile;

use crate::{CoreError, Resume, SCHEMA_VERSION};

pub fn from_json_str(s: &str) -> Result<Resume, CoreError> {
    let resume: Resume = serde_json::from_str(s)?;
    check_schema(&resume)?;
    Ok(resume)
}

pub fn to_json_string(resume: &Resume) -> Result<String, CoreError> {
    Ok(serde_json::to_string_pretty(resume)?)
}

pub fn load_json(path: &Path) -> Result<Resume, CoreError> {
    let bytes = fs::read(path)?;
    let resume: Resume = serde_json::from_slice(&bytes)?;
    check_schema(&resume)?;
    Ok(resume)
}

pub fn save_json(resume: &Resume, path: &Path) -> Result<(), CoreError> {
    let dir = path.parent().unwrap_or_else(|| Path::new("."));
    fs::create_dir_all(dir)?;

    let mut tmp = NamedTempFile::new_in(dir)?;
    let body = serde_json::to_vec_pretty(resume)?;
    tmp.write_all(&body)?;
    tmp.flush()?;
    tmp.persist(path).map_err(|e| e.error)?;
    Ok(())
}

fn check_schema(resume: &Resume) -> Result<(), CoreError> {
    if resume.meta.schema_version != SCHEMA_VERSION {
        return Err(CoreError::UnsupportedSchema {
            found: resume.meta.schema_version.clone(),
            expected: SCHEMA_VERSION.to_string(),
        });
    }
    Ok(())
}
