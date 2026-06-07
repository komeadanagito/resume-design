use std::path::PathBuf;

use resume_core::{io, Resume};
use tauri::AppHandle;

use crate::error::AppError;
use crate::paths;

/// Load a resume. When `path` is `None`, falls back to the platform default.
/// Returns a blank resume when the file does not exist (first launch).
#[tauri::command]
pub fn load_resume(app: AppHandle, path: Option<PathBuf>) -> Result<Resume, AppError> {
    let target = match path {
        Some(p) => p,
        None => paths::default_resume_file(&app)?,
    };
    if !target.exists() {
        return Ok(Resume::blank());
    }
    Ok(io::load_json(&target)?)
}

/// Save a resume. When `path` is `None`, falls back to the platform default.
#[tauri::command]
pub fn save_resume(app: AppHandle, resume: Resume, path: Option<PathBuf>) -> Result<(), AppError> {
    let target = match path {
        Some(p) => p,
        None => paths::default_resume_file(&app)?,
    };
    io::save_json(&resume, &target)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    //! Pure-Rust round-trip test that exercises `resume_core::io` directly via
    //! the same path the command would take if `path` were supplied. We don't
    //! spin up a Tauri runtime here — that's covered by manual smoke testing.

    use resume_core::Resume;

    #[test]
    fn explicit_path_save_then_load_round_trips() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("resume.json");
        let original = Resume::blank();

        resume_core::io::save_json(&original, &path).unwrap();
        let restored = resume_core::io::load_json(&path).unwrap();

        assert_eq!(original, restored);
    }
}
